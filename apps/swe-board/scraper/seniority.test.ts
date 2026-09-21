import { describe, expect, test } from "bun:test"
import type { Seniority } from "../shared/types"
import { inferSeniority } from "./seniority"

const SAMPLES: Record<Seniority, string[]> = {
  entry: [
    "Junior Software Engineer",
    "Jr. Backend Developer",
    "Software Engineer I",
    "Software Engineer 1",
    "Entry-Level Software Engineer",
    "New Grad Software Engineer",
    "Graduate Software Engineer",
    "Software Engineer Intern",
    "Software Engineering Internship, Summer 2027",
  ],
  associate: ["Associate Software Engineer", "Associate Engineer, Platform"],
  mid: [
    "Software Engineer",
    "Software Engineer, Payments",
    "Software Engineer II",
    "Software Engineer III",
    "Frontend Engineer II",
    "SDE II",
    "Software Engineer 2",
    "Full-Stack Developer",
    "Member of Technical Staff",
    "Site Reliability Engineer",
    "Founding Engineer",
  ],
  senior: [
    "Senior Software Engineer",
    "Sr. Software Engineer, Payments",
    "Senior Software Engineer II",
    "Lead Software Engineer",
    "Tech Lead/Sr Backend (Go) Developer",
    "Software Engineer IV",
    "Engineer V",
    "Software Engineer 5",
    "Senior Member of Technical Staff",
  ],
  staff: ["Staff Software Engineer", "Senior Staff Engineer", "Staff+ Software Engineer", "Staff DevSecOps Engineer (TS/SCI)"],
  principal: ["Principal Engineer", "Senior Principal Software Engineer", "Distinguished Engineer", "Fellow, Infrastructure"],
  manager: [
    "Engineering Manager",
    "Senior Engineering Manager",
    "Sr. Manager, Engineering - Search",
    "Director of Engineering, Platform",
    "Head of Engineering",
    "VP of Engineering",
    "Vice President, Engineering",
    "Staff Engineering Manager",
    "Principal Engineering Manager",
    "CTO",
  ],
  unknown: ["Account Executive", "Data Scientist", "Technical Writer", ""],
}

describe("inferSeniority", () => {
  for (const [bucket, titles] of Object.entries(SAMPLES) as [Seniority, string[]][]) {
    test.each(titles)(`%s -> ${bucket}`, (title) => {
      expect(inferSeniority(title)).toBe(bucket)
    })
  }
})

test("roman level words need the role word right before them", () => {
  expect(inferSeniority("Software Engineer in Test")).toBe("mid")
  expect(inferSeniority("Software Engineer, Series I Platform")).toBe("mid")
})
