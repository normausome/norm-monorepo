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

    fileprivate static func easternParts(_ date: Date) -> (weekday: Int, minutes: Int) {
        let components = easternCalendar.dateComponents([.weekday, .hour, .minute], from: date)
        let hour = components.hour ?? 0
        let minute = components.minute ?? 0
        return (components.weekday ?? 1, hour * 60 + minute)
    }
}

/// Approximate open direction for reversible 95/395 Express Lanes.
/// Port of `reversibleStatus` in `apps/va-express-tolls/src/lib/schedule.ts`.
enum ReversibleDirection: String, Hashable, Sendable {
    case nb
    case sb

    var word: String { self == .nb ? "northbound" : "southbound" }

    var asDirection: Direction {
        switch self {
        case .nb: .nb
        case .sb: .sb
        }
    }
}

enum ReversibleStatus: Hashable, Sendable {
    case open(direction: ReversibleDirection, until: String)
    case closed(next: ReversibleDirection, opensAt: String)

    /// Direction to pre-select: the open one, or the next one when closed for reversal.
    var preferredDirection: ReversibleDirection {
        switch self {
        case .open(let direction, _): direction
        case .closed(let next, _): next
        }
    }
}

enum ReversibleSchedule {
    static let learnURL = URL(string: "https://www.expresslanes.com/learn-the-lanes/")!

    static func isReversible(_ id: CorridorId) -> Bool {
        id == .express395 || id == .express95
    }

    static func status(at now: Date = Date()) -> ReversibleStatus {
        let parts = InsideBeltwaySchedule.easternParts(now)
        // Calendar weekday: 1 = Sunday … 7 = Saturday
        if parts.weekday == 1 {
            return .open(direction: .nb, until: "about 10 AM Monday")
        }
        if parts.weekday == 7 {
            if parts.minutes < 14 * 60 {
                return .open(direction: .sb, until: "about 2 PM")
            }
            if parts.minutes < 16 * 60 {
                return .closed(next: .nb, opensAt: "about 4 PM")
            }
            return .open(direction: .nb, until: "about 10 AM Monday")
        }
        // Monday has no 1–2:30 AM closure (Sunday NB continues).
        if parts.weekday != 2 {
            if parts.minutes < 60 {
                return .open(direction: .sb, until: "about 1 AM")
            }
            if parts.minutes < 2 * 60 + 30 {
                return .closed(next: .nb, opensAt: "about 2:30 AM")
            }
        }
        if parts.minutes < 10 * 60 {
            return .open(direction: .nb, until: "about 10 AM")
        }
        if parts.minutes < 12 * 60 {
            return .closed(next: .sb, opensAt: "about noon")
        }
        let until = parts.weekday == 6 ? "about 2 PM Saturday" : "about 1 AM"
        return .open(direction: .sb, until: until)
    }
}
