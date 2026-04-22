import Foundation
import UIKit
import Capacitor
import FirebaseCore

/// Subclase de CAPBridgeViewController que registra PidooFCMPlugin con el bridge
/// y deja log en push_debug_logs para diagnosticar si el storyboard la instancia.
@objc(MainViewController)
public class MainViewController: CAPBridgeViewController {

    public override func capacitorDidLoad() {
        sendDebugLog(event: "ios_mainvc_loaded")

        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
            sendDebugLog(event: "ios_firebase_configured")
        }

        bridge?.registerPluginType(PidooFCMPlugin.self)
        sendDebugLog(event: "ios_plugin_registered")
    }

    private func sendDebugLog(event: String) {
        guard let url = URL(string: "https://rmrbxrabngdmpgpfmjbo.supabase.co/rest/v1/push_debug_logs") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.addValue("application/json", forHTTPHeaderField: "Content-Type")
        let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmJ4cmFibmdkbXBncGZtamJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMzAyNTksImV4cCI6MjA4OTYwNjI1OX0.Aj2VoA6XWcokJDJdhBwfNXnLCUEOlQfTdB0std1SNWE"
        req.addValue(anonKey, forHTTPHeaderField: "apikey")
        req.addValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        let body: [String: Any] = ["platform": "ios", "event": event]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        URLSession.shared.dataTask(with: req).resume()
    }
}
