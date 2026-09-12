import Foundation

/// Schedule-only view of I-66 Inside the Beltway tolling (weekdays, EB 5:30–9:30 AM,
/// WB 3:00–7:00 PM Eastern). Port of `src/lib/schedule.ts`; ignores federal holidays.
public enum InsideBeltwayStatus: Equatable, Sendable {
    case tolling(direction: Direction, until: String)
    case free(next: String)

    public var summary: String {
        switch self {
        case .tolling(let direction, let until):
            return "Tolling now \(direction == .eb ? "eastbound" : "westbound") until \(until)."
        case .free(let next):
            return "Not tolled right now — \(next)."
        }
    }
}

public enum InsideBeltwaySchedule {
    public static let eastern = TimeZone(identifier: "America/New_York")!

    public static func status(at date: Date = Date()) -> InsideBeltwayStatus {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = eastern
        let parts = calendar.dateComponents([.weekday, .hour, .minute], from: date)
        let weekday = parts.weekday ?? 1 // 1 = Sunday … 7 = Saturday
        let minutes = (parts.hour ?? 0) * 60 + (parts.minute ?? 0)
        let weekend = weekday == 1 || weekday == 7
        let am = (start: 5 * 60 + 30, end: 9 * 60 + 30)
        let pm = (start: 15 * 60, end: 19 * 60)

        if !weekend {
            if minutes >= am.start && minutes < am.end { return .tolling(direction: .eb, until: "9:30 AM") }
            if minutes >= pm.start && minutes < pm.end { return .tolling(direction: .wb, until: "7:00 PM") }
            if minutes < am.start { return .free(next: "eastbound tolls start 5:30 AM") }
            if minutes < pm.start { return .free(next: "westbound tolls start 3:00 PM") }
        }
        let friday = weekday == 6
        return .free(next: friday || weekend ? "eastbound tolls resume Monday 5:30 AM" : "eastbound tolls resume 5:30 AM tomorrow")
    }
}
