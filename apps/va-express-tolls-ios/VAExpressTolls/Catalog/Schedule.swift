import Foundation

/// Port of `apps/va-express-tolls/src/lib/schedule.ts`. Federal holidays are
/// not modeled there either — those days are free on I-66 Inside, but this
/// helper only knows the weekday peak windows.
enum InsideBeltwayStatus: Hashable, Sendable {
    case tolling(direction: PeakDirection, until: String)
    case free(next: String)
}

enum PeakDirection: String, Hashable, Sendable {
    case eastbound
    case westbound
}

enum InsideBeltwaySchedule {
    static let timeZone = TimeZone(identifier: "America/New_York")!

    static var easternCalendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        return calendar
    }

    static func status(at now: Date = Date()) -> InsideBeltwayStatus {
        let parts = easternParts(now)
        let weekend = parts.weekday == 1 || parts.weekday == 7
        let am = (start: 5 * 60 + 30, end: 9 * 60 + 30)
        let pm = (start: 15 * 60, end: 19 * 60)

        if !weekend {
            if parts.minutes >= am.start && parts.minutes < am.end {
                return .tolling(direction: .eastbound, until: "9:30 AM")
            }
            if parts.minutes >= pm.start && parts.minutes < pm.end {
                return .tolling(direction: .westbound, until: "7:00 PM")
            }
            if parts.minutes < am.start {
                return .free(next: "eastbound tolls start 5:30 AM")
            }
            if parts.minutes < pm.start {
                return .free(next: "westbound tolls start 3:00 PM")
            }
        }

        let fridayOrWeekend = parts.weekday == 6 || weekend
        return .free(
            next: fridayOrWeekend
                ? "eastbound tolls resume Monday 5:30 AM"
                : "eastbound tolls resume 5:30 AM tomorrow"
        )
    }

    /// Quarter-hour slots inside the tolled window, matching the web estimator.
    static func peakSlots(direction: Direction) -> [(value: String, label: String)] {
        let start = direction == .wb ? 15 * 60 : 5 * 60 + 30
        let end = direction == .wb ? 19 * 60 : 9 * 60 + 30
        var slots: [(value: String, label: String)] = []
        var minutes = start
        while minutes < end {
            let hour = minutes / 60
            let minute = minutes % 60
            let value = String(format: "%02d:%02d", hour, minute)
            let hour12 = ((hour + 11) % 12) + 1
            let meridiem = hour < 12 ? "AM" : "PM"
            let label = String(format: "%d:%02d %@", hour12, minute, meridiem)
            slots.append((value, label))
            minutes += 15
        }
        return slots
    }

    static func easternDateString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = timeZone
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    static func startOfEasternDay(_ date: Date) -> Date {
        easternCalendar.startOfDay(for: date)
    }

    private static func easternParts(_ date: Date) -> (weekday: Int, minutes: Int) {
        let components = easternCalendar.dateComponents([.weekday, .hour, .minute], from: date)
        let hour = components.hour ?? 0
        let minute = components.minute ?? 0
        return (components.weekday ?? 1, hour * 60 + minute)
    }
}
