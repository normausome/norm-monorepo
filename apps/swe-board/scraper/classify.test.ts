import { describe, expect, test } from "bun:test"
import { classifyGeo, inferWorkMode, isSweTitle, parseSalaryText, passesSalaryFloor } from "./classify"

describe("isSweTitle", () => {
  test.each([
    ["Senior Software Engineer, Payments", true],
    ["Staff Backend Engineer", true],
    ["Frontend Engineer II", true],
    ["Full-Stack Developer", true],
    ["Machine Learning Engineer", true],
    ["Site Reliability Engineer", true],
    ["Application Security Engineer", true],
    ["Director of Engineering, Platform", true],
    ["Forward Deployed Engineer", true],
    ["Member of Technical Staff", true],
    ["Tech Lead/Sr Backend (Go) Developer", true],
    ["Staff DevSecOps Engineer (TS/SCI)", true],
    ["Software Engineer (Contract)", false],
    ["Chief of Staff, Public Sector Engineering & Security", false],
    ["IT Systems Engineer", false],
    ["Principal Systems Engineer, Air Vehicle Software", false],
    ["Senior Low Observables Engineer, RCS", false],
    ["Lead Security Engineer, GRC", false],
    ["ML Engineer Manager, AI Conversation Platform", false],
    ["Sr. Manager, Engineering - Search", false],
    ["AI Engineer, Customer Success", false],
    ["Senior Software Engineer, Customer Dev Tools (Auth0)", true],
    ["Software Engineer Intern", false],
    ["Solutions Engineer", false],
    ["Sales Engineer, Enterprise", false],
    ["Hardware Engineer", false],
    ["Analytics Engineer II", false],
    ["Account Executive", false],
    ["Data Scientist", false],
    ["Engineering Manager", false],
  ])("%s -> %p", (title, expected) => {
    expect(isSweTitle(title)).toBe(expected)
  })
})

describe("parseSalaryText", () => {
  test("picks the range with the highest top end and ignores bonuses", () => {
    const text = "Base pay: $115,000 - $165,000 (Tier 1) or $101,000 - $151,000 (Tier 2). Sign-on bonus up to $5,000."
    expect(parseSalaryText(text)).toEqual({ min: 115_000, max: 165_000, currency: "USD" })
  })
  test("reads K suffixes and en dashes", () => {
    expect(parseSalaryText("Compensation: $150K – $200K plus equity")).toEqual({ min: 150_000, max: 200_000, currency: "USD" })
  })
  test("keeps the currency", () => {
    expect(parseSalaryText("Salary: £90,000 to £120,000")).toEqual({ min: 90_000, max: 120_000, currency: "GBP" })
    expect(parseSalaryText("CAD $140,000 - $180,000")).toEqual({ min: 140_000, max: 180_000, currency: "CAD" })
  })
  test("a single figure is min and max", () => {
    expect(parseSalaryText("The salary for this role is $185,000.")).toEqual({ min: 185_000, max: 185_000, currency: "USD" })
  })
  test("returns null when nothing looks like annual pay", () => {
    expect(parseSalaryText("Enjoy a $500 home office stipend and $20/month wellness credit.")).toBeNull()
    expect(parseSalaryText("No pay listed.")).toBeNull()
  })
})

describe("passesSalaryFloor", () => {
  test("unlisted pay passes", () => expect(passesSalaryFloor(null)).toBe(true))
  test("USD top end at or above 100k passes", () => {
    expect(passesSalaryFloor({ min: 80_000, max: 100_000, currency: "USD" })).toBe(true)
    expect(passesSalaryFloor({ min: 120_000, max: null, currency: "USD" })).toBe(true)
  })
  test("USD top end under 100k fails", () => {
    expect(passesSalaryFloor({ min: 70_000, max: 95_000, currency: "USD" })).toBe(false)
  })
  test("non-USD pay is not judged", () => {
    expect(passesSalaryFloor({ min: 50_000, max: 60_000, currency: "EUR" })).toBe(true)
  })
})

describe("inferWorkMode", () => {
  test("location wins over body", () => {
    expect(inferWorkMode("Software Engineer", ["Remote US"], "We meet in person quarterly.")).toBe("remote")
    expect(inferWorkMode("Software Engineer (Hybrid)", ["New York, NY"], "fully remote is not possible")).toBe("hybrid")
  })
  test("body phrases fill in when the headline says nothing", () => {
    expect(inferWorkMode("Software Engineer", ["San Francisco"], "This is a fully remote role.")).toBe("remote")
    expect(inferWorkMode("Software Engineer", ["San Francisco"], "You will work on-site five days a week.")).toBe("onsite")
    expect(inferWorkMode("Software Engineer", ["San Francisco"], "We ship software.")).toBe("unknown")
  })
})

describe("classifyGeo", () => {
  test("Remote US location is tier C us_only", () => {
    const geo = classifyGeo(["Remote US"], "Build payments.", "remote")
    expect(geo.latamEligibility).toBe("us_only")
    expect(geo.note).toBe('Tier C: "Remote US"')
  })
  test("US plus Mexico or Brazil hiring statement is tier A latam_mx_br with a quote", () => {
    const geo = classifyGeo(["Remote"], "We hire remotely in the US, Canada, Mexico and Brazil for this team.", "remote")
    expect(geo.latamEligibility).toBe("latam_mx_br")
    expect(geo.tier).toBe("A")
    expect(geo.note).toContain("US, Canada, Mexico and Brazil")
  })
  test("LatAm-only location is tier B latam_mx_br", () => {
    const geo = classifyGeo(["Remote - LATAM", "Mexico City"], "Join our team.", "remote")
    expect(geo).toEqual({ tier: "B", latamEligibility: "latam_mx_br", note: 'Tier B: "Remote - LATAM; Mexico City"' })
  })
  test("must live in the US body text is tier C", () => {
    const geo = classifyGeo(["Remote"], "Candidates must be located in the United States and be W-2 eligible.", "remote")
    expect(geo.tier).toBe("C")
    expect(geo.latamEligibility).toBe("us_only")
  })
  test("onsite or unstated mode in a US city is tier C", () => {
    expect(classifyGeo(["San Francisco, CA"], "Come build with us.", "onsite")).toEqual({
      tier: "C",
      latamEligibility: "us_only",
      note: "Tier C: onsite in San Francisco, CA, no remote statement",
    })
    expect(classifyGeo(["Washington, DC"], "Come build with us.", "unknown").note).toBe("Tier C: located in Washington, DC, no remote statement")
  })
  test("remote with no statement is tier D unknown", () => {
    expect(classifyGeo(["Remote"], "Come build with us.", "remote")).toEqual({
      tier: "D",
      latamEligibility: "unknown",
      note: "Tier D: no geo statement. Location: Remote",
    })
  })
  test("onsite outside the US is tier D unknown", () => {
    expect(classifyGeo(["London"], "Come build with us.", "onsite").latamEligibility).toBe("unknown")
  })
})
