import SwiftUI

/// Mirrors the web `ThemeToggle`: follow the system until the user pins a choice.
enum ThemePreference: String, CaseIterable, Identifiable, Sendable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }

    var toggleLabel: String {
        switch self {
        case .system, .light: "Switch to dark mode"
        case .dark: "Switch to light mode"
        }
    }

    mutating func toggle(against systemDark: Bool) {
        switch self {
        case .system:
            self = systemDark ? .light : .dark
        case .light:
            self = .dark
        case .dark:
            self = .light
        }
    }
}
