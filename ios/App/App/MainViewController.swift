import Foundation
import Capacitor
import FirebaseCore

/// Subclase de CAPBridgeViewController que:
/// 1. Inicializa Firebase al arranque (antes de que el webview cargue).
/// 2. Registra PidooFCMPlugin manualmente en el bridge de Capacitor.
///
/// En Capacitor 8 los plugins que viven en el target App (no en SPM) no se
/// auto-descubren; hay que registrarlos explicitamente aqui.
@objc(MainViewController)
public class MainViewController: CAPBridgeViewController {

    public override func capacitorDidLoad() {
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        bridge?.registerPluginType(PidooFCMPlugin.self)
    }
}
