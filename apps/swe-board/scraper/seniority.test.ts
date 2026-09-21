import { describe, expect, test } from "bun:test"
import type { Seniority } from "../shared/types"
import { inferSeniority } from "./seniority"

const SAMPLES: Record<Seniority, string[]> = {
  entry: [
    "Junior Software Engineer",
    "Jr. Backend Developer",
    "Software Engineer I",
    "Software Engineer 1 (Backend)",
    "Entry-Level Software Engineer",
    "New Grad Software Engineer",
    "Graduate Software Engineer",
    "Software Engineer Intern",
    "Software Engineering Internship, Summer 2027",
    "2027 Early Career Software Engineer",
    "Desenvolvedor(a) Júnior",
    "Estagiário de Desenvolvimento",
    "Développeur Logiciels (Stagiaire), Backend (l'été 2027 - Montreal)",
  ],
  associate: ["Associate Software Engineer", "Associate Engineer, Platform"],
  mid: [
    "Software Engineer",
    "Software Engineer, Payments",
    "Software Engineer II",
    "Software Engineer III",
    "Frontend Engineer II",
    "SDE II",
    "Software Engineer 3, Atlas Search Systems",
    "Full-Stack Developer",
    "Member of Technical Staff",
    "Member of Technical Staff - Applied AI",
    "Site Reliability Engineer",
    "Founding Engineer",
    "Software Engineer, Mid-Level",
    "Intermediate Software Developer",
    "Forward Deployed Engineer, Legal [Office of the CTO]",
    "Multinational Digital Infrastructure - Full Stack SW Eng. (US)",
    "Desenvolvedor Backend",
    "Desenvolvedor(a) Backend .NET Pleno",
    "Desenvolvedor(a) Fullstack Java + Angular | Mid Level",
    "Pessoa Desenvolvedora Fullstack React/Node Analista III",
    "Desarrollador de Software",
  ],
  senior: [
    "Senior Software Engineer",
    "Sr. Software Engineer, Payments",
    "Senior Software Engineer II",
    "Lead Software Engineer",
    "Tech Lead/Sr Backend (Go) Developer",
    "Forward Deployed Engineering Lead",
    "Software Engineer IV",
    "Engineer V",
    "Software Engineer 5",
    "Senior Member of Technical Staff",
    "AI Engineer Sênior",
    "Desenvolvedor(a) Back-End Java Sênior",
    "Desenvolvedor Fullstack SR (C# / React)",
    "SRE Sênior",
  ],
  staff: [
    "Staff Software Engineer",
    "Senior Staff Engineer",
    "Staff+ Software Engineer",
    "Staff DevSecOps Engineer (TS/SCI)",
    "Senior / Staff Fullstack Engineer",
    "Founding Staff Mobile Engineer",
    "Especialista FrontEnd – Design System",
  ],
  principal: [
    "Principal Engineer",
    "Senior Principal Software Engineer",
    "Tech Lead /Sr. Principal Engineer (L6)",
    "Distinguished Engineer",
    "Fellow, Infrastructure",
  ],
  manager: [
    "Engineering Manager",
    "Senior Engineering Manager",
    "Sr. Manager, Engineering - Search",
    "Director of Engineering, Platform",
    "Director, Engineering",
    "Senior Director of Engineering, Billing Platform",
    "Head of Engineering",
    "VP of Engineering",
    "Vice President, Engineering",
    "RVP, Forward Deployed Engineering - EMEA",
    "Staff Engineering Manager",
    "Principal Engineering Manager",
    "Chief Technology Officer",
  ],
  unknown: ["Account Executive", "Data Scientist", "Technical Writer", "PL Desenvolvimento Full Stack (Java & React)", ""],
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
  expect(inferSeniority("Software Engineer (Infra)")).toBe("mid")
})
