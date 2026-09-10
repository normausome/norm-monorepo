import XCTest
@testable import VAExpressTolls

final class ScheduleTests: XCTestCase {
    func testWeekdayMorningIsEastbound() {
        let status = InsideBeltwaySchedule.status(at: eastern(2026, 9, 9, 8, 0))
        XCTAssertEqual(status, .tolling(direction: .eastbound, until: "9:30 AM"))
    }

    func testWeekdayAfternoonIsWestbound() {
        let status = InsideBeltwaySchedule.status(at: eastern(2026, 9, 9, 16, 0))
        XCTAssertEqual(status, .tolling(direction: .westbound, until: "7:00 PM"))
    }

    func testNineThirtyIsOffPeak() {
        let status = InsideBeltwaySchedule.status(at: eastern(2026, 9, 9, 9, 30))
        XCTAssertEqual(status, .free(next: "westbound tolls start 3:00 PM"))
    }

    func testEarlyMorningPointsAtEastbound() {
        let status = InsideBeltwaySchedule.status(at: eastern(2026, 9, 9, 4, 0))
        XCTAssertEqual(status, .free(next: "eastbound tolls start 5:30 AM"))
    }

    func testWednesdayEveningResumesTomorrow() {
        let status = InsideBeltwaySchedule.status(at: eastern(2026, 9, 9, 20, 0))
        XCTAssertEqual(status, .free(next: "eastbound tolls resume 5:30 AM tomorrow"))
    }

    func testFridayEveningResumesMonday() {
        let status = InsideBeltwaySchedule.status(at: eastern(2026, 9, 11, 20, 0))
        XCTAssertEqual(status, .free(next: "eastbound tolls resume Monday 5:30 AM"))
    }

    func testSaturdayIsFreeUntilMonday() {
        let status = InsideBeltwaySchedule.status(at: eastern(2026, 9, 12, 10, 0))
        XCTAssertEqual(status, .free(next: "eastbound tolls resume Monday 5:30 AM"))
    }

    func testEastboundPeakSlots() {
        let slots = InsideBeltwaySchedule.peakSlots(direction: .eb)
        XCTAssertEqual(slots.first?.value, "05:30")
        XCTAssertEqual(slots.first?.label, "5:30 AM")
        XCTAssertEqual(slots.last?.value, "09:15")
        XCTAssertFalse(slots.contains(where: { $0.value == "09:30" }))
    }

    func testWeekdayMorningReversibleIsNorthbound() {
        let status = ReversibleSchedule.status(at: eastern(2026, 9, 9, 8, 0))
        XCTAssertEqual(status, .open(direction: .nb, until: "about 10 AM"))
    }

    func testWeekdayAfternoonReversibleIsSouthbound() {
        let status = ReversibleSchedule.status(at: eastern(2026, 9, 9, 16, 0))
        XCTAssertEqual(status, .open(direction: .sb, until: "about 1 AM"))
    }

    func testWeekdayMiddayReversibleIsClosed() {
        let status = ReversibleSchedule.status(at: eastern(2026, 9, 9, 11, 0))
        XCTAssertEqual(status, .closed(next: .sb, opensAt: "about noon"))
    }

    func testSundayReversibleIsNorthbound() {
        let status = ReversibleSchedule.status(at: eastern(2026, 9, 13, 15, 0))
        XCTAssertEqual(status, .open(direction: .nb, until: "about 10 AM Monday"))
    }

    func testSaturdayAfternoonReversibleIsClosed() {
        let status = ReversibleSchedule.status(at: eastern(2026, 9, 12, 15, 0))
        XCTAssertEqual(status, .closed(next: .nb, opensAt: "about 4 PM"))
    }

    private func eastern(_ year: Int, _ month: Int, _ day: Int, _ hour: Int, _ minute: Int) -> Date {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        components.hour = hour
        components.minute = minute
        let date = InsideBeltwaySchedule.easternCalendar.date(from: components)
        XCTAssertNotNil(date)
        return date!
    }
}
