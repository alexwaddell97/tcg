import UIKit
import AVFAudio
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = ArenaBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

// Native playback provides independent gain for music and overlapping effects.
final class ArenaBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(ArenaAudioPlugin())
    }
}

@objc(ArenaAudioPlugin)
final class ArenaAudioPlugin: CAPPlugin, CAPBridgedPlugin, AVAudioPlayerDelegate {
    let identifier = "ArenaAudioPlugin"
    let jsName = "ArenaAudio"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "volume", returnType: CAPPluginReturnPromise),
    ]
    private var players: [String: AVAudioPlayer] = [:]

    @objc func play(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let id = call.getString("id"), let path = call.getString("path"),
                  let root = Bundle.main.resourceURL?.appendingPathComponent("public") else {
                call.reject("Missing audio source"); return
            }
            // Device bundle URLs may contain /private aliases or a trailing slash.
            // Compare canonical path components, never differently formatted strings.
            let canonicalRoot = root.resolvingSymlinksInPath().standardizedFileURL
            let url = canonicalRoot.appendingPathComponent(path).resolvingSymlinksInPath().standardizedFileURL
            let rootParts = canonicalRoot.pathComponents
            guard url.pathComponents.count > rootParts.count,
                  Array(url.pathComponents.prefix(rootParts.count)) == rootParts else {
                call.reject("Invalid audio path"); return
            }
            do {
                let player = try self.players[id] ?? AVAudioPlayer(contentsOf: url)
                player.delegate = self
                player.enableRate = true
                player.rate = Float(call.getDouble("rate") ?? 1)
                player.volume = Float(max(0, min(1, call.getDouble("volume") ?? 1)))
                self.players[id] = player
                try AVAudioSession.sharedInstance().setActive(true)
                guard player.play() else { self.players.removeValue(forKey: id); call.reject("Audio could not play"); return }
                call.resolve()
            } catch { call.reject("Audio could not load: \(path)", nil, error) }
        }
    }
    @objc func pause(_ call: CAPPluginCall) {
        DispatchQueue.main.async { self.players[call.getString("id") ?? ""]?.pause(); call.resolve() }
    }
    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.players.removeValue(forKey: call.getString("id") ?? "")?.stop()
            call.resolve()
        }
    }
    @objc func volume(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.players[call.getString("id") ?? ""]?.volume = Float(max(0, min(1, call.getDouble("volume") ?? 1)))
            call.resolve()
        }
    }
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        guard let id = players.first(where: { $0.value === player })?.key else { return }
        players.removeValue(forKey: id)
        notifyListeners("ended", data: ["id": id, "success": flag])
    }
    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        audioPlayerDidFinishPlaying(player, successfully: false)
    }
}
