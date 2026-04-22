import Foundation
import Capacitor
import FirebaseCore
import FirebaseMessaging

/// Plugin Capacitor interno para obtener el FCM token en iOS.
/// Sustituye a @capacitor-community/fcm que no tiene build para Capacitor 8.
@objc(PidooFCMPlugin)
public class PidooFCMPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PidooFCMPlugin"
    public let jsName = "PidooFCM"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getToken", returnType: CAPPluginReturnPromise)
    ]

    @objc func getToken(_ call: CAPPluginCall) {
        // Asegura que Firebase esta configurado
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        Messaging.messaging().token { token, error in
            if let error = error {
                call.reject("Error obteniendo FCM token: \(error.localizedDescription)")
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
