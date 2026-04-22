import Foundation
import Capacitor
import FirebaseCore
import FirebaseMessaging

/// Plugin Capacitor interno para obtener el FCM token en iOS.
/// Firebase se configura lazily en el primer getToken() para no tocar
/// nada en el arranque (evita crashes).
@objc(PidooFCMPlugin)
public class PidooFCMPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PidooFCMPlugin"
    public let jsName = "PidooFCM"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getToken", returnType: CAPPluginReturnPromise)
    ]

    @objc func getToken(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if FirebaseApp.app() == nil {
                FirebaseApp.configure()
            }
            Messaging.messaging().token { token, error in
                if let error = error {
                    call.reject("FCM error: \(error.localizedDescription)")
                    return
                }
                guard let token = token, !token.isEmpty else {
                    call.reject("FCM token vacio")
                    return
                }
                call.resolve(["token": token])
            }
        }
    }
}
