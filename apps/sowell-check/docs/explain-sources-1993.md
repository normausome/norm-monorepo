# 1993 explanation sources

Checked 23 September 2026. This file is for the next edit of `apps/sowell-check`. Do not treat it as a change to the quiz. `questions.json` and `App.tsx` stay as they are.

The 1993 questions ask what Sowell said in the 14 October 1993 Jacksonville speech. The correct choice stays the choice that matches the speech. The proposed `explain` strings keep that attribution, then add outside figures with links.

Talk page that already resolves: [Thomas Sowell, Institution for World Capitalism, 14 October 1993](https://www.youtube.com/watch?v=Wh-qTnq-cwM). This pass did not re-time the audio.

## Where the text lives

Each question in `apps/sowell-check/src/data/questions.json` has `explain` and `source` as strings. `App.tsx` prints both as plain text. The feedback block is `<p>{question.explain}</p>` and a following line `Source: {question.source}`. A URL inside either string is not a link.

## Numbers that do not match the printed sources

- `econ-pol-1993-q04`. The 1 life and the 60 highway deaths are in McKenzie and Lee, Cato Briefing Paper No. 11, 30 August 1990, note 23. The paper prints extra wreck losses of $6 million a year, not $72 million. Twelve times $6 million is $72 million. That product is an inference, not a sentence in the paper. A December 2011 FAA update, which the 1993 speech cannot cite, uses 72 as a count of extra transportation deaths over 10 years, and about 1 infant life saved over 10 to 15 years.
- `econ-pol-1993-q05`. Official accounts support zero direct deaths from the accident. A contemporary local report does not support two highway deaths. The figure of about 52 replacement-power deaths was not found.
- `econ-pol-1993-q06`. Wilson's 1979 one-in-a-million table has the 50-year, 5-mile nuclear line and the 6-minute canoe line. It does not have 10 interstate miles or 30 minutes in a coal mine.
- `econ-pol-1993-q08`. The official poverty rate falls from 1959 to 1964. The AFDC recipient count rises across the same years.
- `econ-pol-1993-q10`. Official shares near the speech are 13.2 percent of GDP for 1991, then 13.6 percent for 1992 and 13.9 percent for 1993 in a later article. Not a printed 14.0 percent of GNP.
- `econ-pol-1993-q11`. The 14-times malpractice ratio was not found.

## econ-pol-1993-q04

Current explain. "Sowell says economists estimated that a decade of a baby airplane-seat mandate would save 1 baby life, lose about 60 other lives, and cost about $72 million."

### Verified claims

- Richard B. McKenzie and Dwight R. Lee, Cato Briefing Paper No. 11, 30 August 1990, say automobile travel was at least 30 times deadlier per mile than travel on all scheduled airlines.
- The same paper cites a Department of Transportation draft, "An Impact Analysis of Requiring Child Safety Seats in Air Transportation," 4 June 1990, page iv. That draft, as quoted by McKenzie and Lee, says mandatory infant seats could have prevented at most one infant death since 1978.
- Their model, under the assumptions in the paper, gives more than 175 additional disabling injuries and just under 5 additional highway deaths each year, plus $6 million a year in extra wreck losses. Those losses are wages, medical expenses, and property damage. They sit on top of higher air fares.
- Note 23 states the ratio in words. One infant life over 12 years, from the Department of Transportation estimate for the prior 12 years, against an average of five additional highway deaths each year, is 60 times as many highway deaths as airline deaths saved. The Department of Transportation's own conservative case in that draft, as quoted there, was 19 times, not 60.
- The paper also quotes an FAA estimate that airlines could sell 3.3 million infant seats a year at a cost of $205 million, with a first-year net revenue increase of $119 million. That is not $72 million.
- Nancy Lauck Claussen of the FAA, quoted by Wayne Rosenkrans in Flight Safety Foundation, 9 May 2011, said one child under 2 would be saved in 10 years, and at least 60 children under 2 would die on highways.
- The Federal Register of 26 August 2005 summarizes the 1995 report to Congress. About five infant lives saved aboard aircraft over 10 years, offset by highway deaths. Even a 25 percent infant fare still produced a net increase in fatalities.
- The FAA Office of Accident Investigation and Prevention, December 2011, says a child-restraint mandate would add about 72 transportation deaths over 10 years and 115 over 15 years, against about 1 infant life saved over 10 to 15 years. The PDF uses 72 as deaths.

### Sources

- Richard B. McKenzie and Dwight R. Lee, "Ending the Free Airplane Rides of Infants: A Myopic Method of Saving Lives," Cato Institute Briefing Paper No. 11, 30 August 1990. Canonical address `http://www.cato.org/pubs/briefs/bp-011.html`. A direct request on 23 September 2026 returned HTTP 403. The copy that was read is the [Internet Archive capture from 3 August 2002](https://web.archive.org/web/20020803113933/http://www.cato.org/pubs/briefs/bp-011.html).
- Wayne Rosenkrans, "Collective Wisdom," Flight Safety Foundation, 9 May 2011. [Flight Safety Foundation](https://flightsafety.org/asw-article/collective-wisdom/). Fetched. HTTP 200.
- Federal Aviation Administration, withdrawal of the child-restraint advance notice, Federal Register, 26 August 2005. [Child Restraint Systems](https://www.federalregister.gov/documents/2005/08/26/05-16783/child-restraint-systems). Fetched.
- Federal Aviation Administration, Office of Accident Investigation and Prevention, "Update of Safety Benefits and Tradeoffs Related to Requiring the Use of Child Restraint Systems on Aircraft for Children Less Than Two Years of Age," December 2011. The Department of Transportation HTML page returned HTTP 403 to a direct request. The PDF was read from the [Internet Archive capture](https://web.archive.org/web/20161118013447/https://www.transportation.gov/sites/dot.gov/files/docs/2011-12-29-child-restraint-update.pdf). Live index, not re-fetched here: [Department of Transportation report page](https://www.transportation.gov/faac/report/update-safety-benefits-tradeoffs-related).
- Thomas B. Newman and coauthors, "Effects and Costs of Requiring Child-Restraint Systems for Young Children Traveling on Commercial Airplanes," Archives of Pediatrics and Adolescent Medicine, 2003. [JAMA Network](https://jamanetwork.com/journals/jamapediatrics/fullarticle/481453). The article text was retrieved. A plain request later returned HTTP 403, so treat the page as paywalled for some clients. Open abstract: [PubMed 14557157](https://pubmed.ncbi.nlm.nih.gov/14557157/). Newman cites the Cato paper and reports its estimate as 5 deaths and 175 disabling injuries a year. Newman also reports the 1995 FAA case as a maximum of 5 child plane-crash deaths per 10 years and a net increase of 82 deaths per 10 years.

The June 1990 Department of Transportation draft cited in Cato note 11 was not found as its own public file. UNVERIFIED as a standalone URL.

### Proposed explain

```
Sowell says economists estimated that a decade of a baby airplane-seat mandate would save 1 baby life, lose about 60 other lives, and cost about $72 million. Outside research. McKenzie and Lee, Cato Briefing Paper No. 11, 30 August 1990, [Ending the Free Airplane Rides of Infants](https://web.archive.org/web/20020803113933/http://www.cato.org/pubs/briefs/bp-011.html), say driving was at least 30 times deadlier per mile than scheduled airline travel. They cite a 4 June 1990 Department of Transportation draft that mandatory seats could have prevented at most one infant airline death since 1978. Their model estimates just under 5 extra highway deaths a year. Note 23 sets that against 1 airline life over 12 years, which is 60 highway deaths for each airline life saved. The paper puts extra wreck losses at $6 million a year. It does not print $72 million. Twelve times the annual wreck-loss figure is $72 million, which is how the quiz dollar amount can be reconstructed, and it remains an inference. A December 2011 FAA update, [child-restraint tradeoff PDF](https://web.archive.org/web/20161118013447/https://www.transportation.gov/sites/dot.gov/files/docs/2011-12-29-child-restraint-update.pdf), uses 72 as extra transportation deaths over 10 years, against about 1 infant life over 10 to 15 years. The FAA's 1995 report to Congress, summarized in the [26 August 2005 Federal Register notice](https://www.federalregister.gov/documents/2005/08/26/05-16783/child-restraint-systems), estimated about five infant lives saved on aircraft over 10 years and still found a net increase in deaths.
```

Confidence. High for the 30-times mile comparison, the "at most one" airline death since 1978, the "just under 5" highway deaths a year, and the 60-times ratio in Cato note 23. Medium for reading the quiz's $72 million as twelve times the paper's $6 million. Low for any claim that a source prints "$72 million" as the cost. The 2011 death count of 72 is high confidence and postdates the speech.

## econ-pol-1993-q05

Current explain. "Sowell says zero died in the Three Mile Island disaster, two died on the highway fleeing, and about 52 lives were lost generating replacement power while the plant was shut."

### Verified claims

- The Department of Energy says the 1979 accident caused no injuries, deaths, or direct health effects. Average dose to the nearby public was about 1 millirem above a background of about 100 to 125 millirem a year.
- The Sentinel, Carlisle, Pennsylvania, in a report Dickinson College reprints, says that as residents returned, at least one person who fled was killed and another was seriously injured. Kristoff Lo Piccolo, age 6, of York, drowned in Hopkins Creek in Essex, Maryland. Paula Matincheck, age 21, of Middletown, was in critical condition after a two-car collision in the Baltimore area. The report does not say she died, and the death it does report is a drowning, not a highway crash.
- A 15 November 1980 letter filed with the Nuclear Regulatory Commission, from Petr Beckmann, estimates more than 173 premature deaths by that date from coal-fired replacement of idle Three Mile Island Unit 1, described as more than two per week. That is an advocate's prorating of coal-pollution estimates. It is not 52, and it is not an official fatality roster.

The figure of about 52 replacement-power deaths was not found. UNVERIFIED.

### Sources

- U.S. Department of Energy, Office of Nuclear Energy, "5 Facts to Know About Three Mile Island." [Department of Energy](https://www.energy.gov/ne/articles/5-facts-know-about-three-mile-island). HTTP 200.
- The Sentinel, Carlisle, Pennsylvania, evacuation report, reprinted by the Dickinson College Three Mile Island collection. [Dickinson College](https://tmi.dickinson.edu/the-sentinel-carlisle-pa-evacuation-in-holding-pattern-estimated-200000-return-to-homes/). HTTP 200.
- Petr Beckmann letter, 15 November 1980, NRC ADAMS accession ML19340C816. [NRC PDF](https://www.nrc.gov/docs/ML1934/ML19340C816.pdf). The PDF text was retrieved. A later plain request returned HTTP 403.
- World Nuclear Association, "Three Mile Island Accident," agrees there were no injuries or detectable health effects from the radiation release. [World Nuclear Association](https://world-nuclear.org/information-library/safety-and-security/safety-of-plants/three-mile-island-accident). HTTP 200. Secondary to the Department of Energy page.

### Proposed explain

```
Sowell says zero died in the Three Mile Island disaster, two died on the highway fleeing, and about 52 lives were lost generating replacement power while the plant was shut. Outside research. The Department of Energy says the accident caused no injuries, deaths, or direct health effects. See [5 Facts to Know About Three Mile Island](https://www.energy.gov/ne/articles/5-facts-know-about-three-mile-island). A Sentinel report reprinted by Dickinson College says one person who fled was killed and another was seriously injured. The death was Kristoff Lo Piccolo, age 6, who drowned in Maryland. Paula Matincheck, age 21, was critically injured in a two-car collision and is not described as dead. See [the Sentinel evacuation report](https://tmi.dickinson.edu/the-sentinel-carlisle-pa-evacuation-in-holding-pattern-estimated-200000-return-to-homes/). This pass did not find two highway deaths or about 52 replacement-power deaths. A 15 November 1980 letter in the NRC docket estimates more than 173 premature deaths by that date from coal power replacing idle Unit 1. See [NRC ML19340C816](https://www.nrc.gov/docs/ML1934/ML19340C816.pdf). That figure is not 52, and it is one writer's proration, not an official death count.
```

Confidence. High that official accounts report no direct deaths from the accident. High that the Sentinel report is one drowning and one critical car injury. Low on Sowell's "two" and "52." Those two numbers stay in the explain only as what the quiz says he said.

## econ-pol-1993-q06

Current explain. "Sowell compares living within 5 miles of a nuclear plant for 50 years to driving 10 miles on the interstate, and also to about 30 minutes in a coal mine or about 6 minutes in a canoe."

### Verified claims

Richard Wilson, "Analyzing the Daily Risks of Life," Technology Review, volume 81, 1979, pages 40 to 46, published a table of activities estimated to raise the chance of death by one in a million. Peter M. Sandman reproduces it as Table B.5. Rows that match the quiz's family of comparisons:

- Living 50 years within 5 miles of a nuclear power plant. Cancer caused by radiation.
- Traveling 6 minutes by canoe. Accident.
- Spending 1 hour in a coal mine. Black lung disease.
- Spending 3 hours in a coal mine. Accident.
- Traveling 300 miles by car. Accident.
- Traveling 10 miles by bicycle. Accident.

The table does not say 10 miles on an interstate. The table does not say 30 minutes in a coal mine. Bernard L. Cohen's online book, chapter 8, ranks "living near a nuclear plant" at 0.4 days of lost life expectancy in a different catalog. It does not contain the canoe line or the 10-mile interstate line. [Cohen, chapter 8](http://www.phyast.pitt.edu/~blc/book/chapter8.html). HTTP 200.

### Sources

- Richard Wilson, Technology Review, 1979, as reproduced by Peter M. Sandman, "Appendix B: Risk Communication, Risk Statistics, and Risk Comparisons." [Sandman appendix](https://www.petersandman.com/articles/cma-appb.htm). The page text was retrieved.
- Bernard L. Cohen, The Nuclear Energy Option, chapter 8, University of Pittsburgh physics site. [Chapter 8](http://www.phyast.pitt.edu/~blc/book/chapter8.html).

The original Technology Review PDF was not opened. The Sandman reproduction names Wilson and the page range. Treat the Sandman page as the copy that was read.

### Proposed explain

```
Sowell compares living within 5 miles of a nuclear plant for 50 years to driving 10 miles on the interstate, and also to about 30 minutes in a coal mine or about 6 minutes in a canoe. Outside research. Richard Wilson's 1979 one-in-a-million table, reprinted by Peter Sandman, [Appendix B risk tables](https://www.petersandman.com/articles/cma-appb.htm), puts living 50 years within 5 miles of a nuclear plant on the same step as 6 minutes by canoe, 1 hour in a coal mine from black lung disease, 3 hours in a coal mine from an accident, and 300 miles by car. The 10-mile line in that table is bicycle travel, not interstate driving. This pass did not find 10 interstate miles or 30 minutes in a coal mine in the table.
```

Confidence. High that the 50-year nuclear line, the 6-minute canoe line, and the coal-mine hour lines are in the Wilson table as Sandman prints it. Low that Sowell's 10 interstate miles and 30 coal-mine minutes are that table. Do not "correct" the choice text. The question asks for his comparison.

## econ-pol-1993-q08

Current explain. "Sowell says that before the War on Poverty, poverty and dependency had been declining for at least a decade."

### Verified claims

Census Table 2, all people, official poverty rate, from the historical people workbook downloaded 23 September 2026:

- 1959, 22.4 percent
- 1960, 22.2 percent
- 1961, 21.9 percent
- 1962, 21.0 percent
- 1963, 19.5 percent
- 1964, 19.0 percent
- 1965, 17.3 percent
- 1966, 14.7 percent

The official series begins in 1959. It shows a decline in the five measured years before the 1964 declaration. It does not, by itself, show a prior decade.

AFDC recipients, average monthly, thousands, NCES Youth Indicators 1996, Indicator 22:

- 1950, 2,233
- 1955, 2,192
- 1960, 3,073
- 1965, 4,396

The recipient count dips slightly from 1950 to 1955 and then rises through 1960 and 1965. HHS describes steady slow growth in the early 1960s, then faster growth after 1967. Fiscal year 1962, 3.593 million recipients. Fiscal year 1964, 4.059 million recipients. Fiscal year 1970, 7.415 million recipients.

Poverty in the official rate was falling. The main cash-welfare caseload was not.

### Sources

- U.S. Census Bureau, Historical Poverty Tables, Table 2. Workbook read directly: [hstpov2.xlsx](https://www2.census.gov/programs-surveys/cps/tables/time-series/historical-poverty-people/hstpov2.xlsx). Index page, HTTP 200: [Historical Poverty Tables: People and Families](https://www.census.gov/data/tables/time-series/demo/income-poverty/historical-poverty-people.html).
- National Center for Education Statistics, Youth Indicators 1996, Indicator 22. [NCES table](https://nces.ed.gov/pubs98/yi/y9622a.asp). HTTP 200. Page text read.
- U.S. Department of Health and Human Services, "Trends in the AFDC Caseload since 1962." [ASPE PDF](https://aspe.hhs.gov/sites/default/files/private/pdf/167036/2caseload.pdf). HTTP 200.

### Proposed explain

```
Sowell says that before the War on Poverty, poverty and dependency had been declining for at least a decade. Outside research. The official poverty rate falls from 22.4 percent in 1959 to 19.0 percent in 1964. Census Table 2 is in [hstpov2.xlsx](https://www2.census.gov/programs-surveys/cps/tables/time-series/historical-poverty-people/hstpov2.xlsx). The official series starts in 1959, so those five years are the measured run before the 1964 declaration, and they fall. AFDC recipients rise from 2.192 million in 1955 to 3.073 million in 1960 and 4.396 million in 1965. See [NCES Indicator 22](https://nces.ed.gov/pubs98/yi/y9622a.asp). HHS describes slow caseload growth in the early 1960s and faster growth after 1967. See [Trends in the AFDC Caseload since 1962](https://aspe.hhs.gov/sites/default/files/private/pdf/167036/2caseload.pdf). The poverty half of the sentence matches the official rate. The dependency half does not match the AFDC count.
```

Confidence. High on the Census rates and the AFDC counts. Medium on equating "dependency" with AFDC recipients. Sowell may have meant a different series. No other pre-1964 dependency series was verified in this pass.

## econ-pol-1993-q09

Current explain. "Sowell says that by 1968 roughly half of U.S. public schools already had sex education."

### Verified claims

The Saturday Evening Post editorial of 29 June 1968, reprinted by the magazine in 2018, says sex had been made part of the public-school curriculum in about half of the nation's schools. The reprint's wording is "the nation's schools," not a counted share of public schools from a named survey.

A 1969 University of Dayton thesis cites John Kobler, "Sex Education in the Classroom," Saturday Evening Post, June 1968, page 27. Kobler's original page was not retrieved. A government census that says half of public schools, and only public schools, was not found.

### Sources

- Saturday Evening Post, editorial of 29 June 1968, reprinted 2018 as "What's the Best Way to Teach Kids about Sex?" [Saturday Evening Post](https://www.saturdayeveningpost.com/2018/05/whats-best-way-teach-kids-sex/). HTTP 200. Page text read.
- Thesis citation of Kobler, page 27. [University of Dayton PDF](https://ecommons.udayton.edu/cgi/viewcontent.cgi?article=6477&context=graduate_theses). The citation line was read. The Kobler article itself was not.

### Proposed explain

```
Sowell says that by 1968 roughly half of U.S. public schools already had sex education. Outside research. A Saturday Evening Post editorial of 29 June 1968 says sex education was already in about half of the nation's schools. The reprint is [What's the Best Way to Teach Kids about Sex?](https://www.saturdayeveningpost.com/2018/05/whats-best-way-teach-kids-sex/). A Dayton thesis cites John Kobler, Sex Education in the Classroom, Saturday Evening Post, June 1968, page 27. See the [thesis PDF](https://ecommons.udayton.edu/cgi/viewcontent.cgi?article=6477&context=graduate_theses). Kobler's page was not retrieved, and no government count limited to public schools was found.
```

Confidence. Medium that a 1968 national magazine said about half of the nation's schools. Low that the underlying count was a survey of public schools only.

## econ-pol-1993-q10

Current explain. "Sowell says the U.S. spends 14% of GNP on health care in the crisis talking point."

### Verified claims

Suzanne W. Letsch, Helen C. Lazenby, Katharine R. Levit, and Cathy A. Cowan, Health Care Financing Review, report national health expenditures of $751.8 billion in 1991, 13.2 percent of GDP, up from 12.2 percent in 1990. The same article moves the published comparison onto GDP. Table 5 shows the revised GNP ratio and the GDP ratio both at 13.2 percent for 1991. GNP exceeded GDP by less than 0.3 percent in 1991.

Katharine R. Levit and coauthors, "National Health Expenditures, 1993," report $884.2 billion in 1993. The GDP share rose from 13.6 percent in 1992 to 13.9 percent in 1993. The same table gives 13.2 percent for 1991. The speech date is 14 October 1993. This 1993 article covers the full calendar year, so it was not the figure in print on the day of the speech. The 13.2 percent figure for 1991 was.

Fourteen percent is a round number beside 13.2, 13.6, and 13.9. It is not a printed official rate of 14.0 percent of GNP.

### Sources

- Letsch, Lazenby, Levit, and Cowan, national health expenditures for 1991. [CMS PDF](https://www.cms.gov/Research-Statistics-Data-and-Systems/Research/HealthCareFinancingReview/Downloads/CMS1191249dl.pdf). Text retrieved.
- Levit, Sensenig, Cowan, Lazenby, McDonnell, Won, Sivarajan, Stiller, Donham, and Stewart, "National Health Expenditures, 1993." [CMS PDF](https://www.cms.gov/research-statistics-data-and-systems/research/healthcarefinancingreview/downloads/cms1191344dl.pdf). HTTP 200. Text retrieved.

### Proposed explain

```
Sowell says the U.S. spends 14 percent of GNP on health care in the crisis talking point. Outside research. HCFA put 1991 health spending at 13.2 percent of GDP, up from 12.2 percent in 1990, and the revised GNP ratio for 1991 was also 13.2 percent. See [the 1991 national health expenditures article](https://www.cms.gov/Research-Statistics-Data-and-Systems/Research/HealthCareFinancingReview/Downloads/CMS1191249dl.pdf). A later article put the GDP share at 13.6 percent in 1992 and 13.9 percent in 1993. See [National Health Expenditures, 1993](https://www.cms.gov/research-statistics-data-and-systems/research/healthcarefinancingreview/downloads/cms1191344dl.pdf). The speech is 14 October 1993, before that full-year 1993 article. Fourteen percent is a round figure next to those shares, not a printed official 14.0 percent of GNP.
```

Confidence. High on 13.2, 13.6, and 13.9 as GDP shares in the two HCFA articles. Medium that "14 percent of GNP" in October 1993 was a rounding of the low-13s. The articles do not print 14.0.

## econ-pol-1993-q11

Current explain. "Sowell says an American doctor pays 14 times as much malpractice insurance as a German doctor."

### Verified claims

No source opened in this pass states that an American doctor's malpractice premium is 14 times a German doctor's.

C. H. Sawyer and T. G. Sawyer, "Comparison of German and United States malpractice systems," Journal of the Florida Medical Association, April 1993, pages 257 to 260, discuss lower litigation pressure in Germany. The abstract does not give a premium multiple. The full article was not opened.

U.S. General Accounting Office, "Medical Malpractice: Insurance Costs Increased but Varied Among Physicians and Hospitals," HRD-86-112, shows large U.S. differences by specialty and county. It is not a Germany comparison.

### Sources

- Sawyer and Sawyer, 1993. [PubMed 8505617](https://pubmed.ncbi.nlm.nih.gov/8505617/). Abstract read. The 14-times ratio is absent from the abstract.
- U.S. General Accounting Office, HRD-86-112. [GAO PDF](https://www.gao.gov/assets/hrd-86-112.pdf). Text retrieved. No German multiple.

The 14-times claim is UNVERIFIED beyond the speech, as the quiz records it.

### Proposed explain

```
Sowell says an American doctor pays 14 times as much malpractice insurance as a German doctor. Outside research. This pass did not find a source that states that multiple. Sawyer and Sawyer, Journal of the Florida Medical Association, April 1993, compare the two malpractice systems. The abstract does not give a premium ratio. See [PubMed 8505617](https://pubmed.ncbi.nlm.nih.gov/8505617/). A GAO report documents wide differences among U.S. doctors by specialty and place, and it does not compare Germany. See [HRD-86-112](https://www.gao.gov/assets/hrd-86-112.pdf).
```

Confidence. Low on the number 14. High that the abstract which was read does not contain it.

## Questions to leave short

These items are definitions or autobiography from the speech. No outside study was needed, and none should be invented.

- `econ-pol-1993-q01`. Garden of Eden, no scarcity.
- `econ-pol-1993-q02`. First lesson of politics.
- `econ-pol-1993-q03`. Art of the plausible.
- `econ-pol-1993-q07`. Stage four of the policy pattern.
- `econ-pol-1993-q12`. Summer government job, not Friedman's course.

Keep the current `explain` and the current `source` line, including the YouTube URL.

## UI note for Composer

`App.tsx` renders `<p className="text-muted-foreground">{question.explain}</p>` and `Source: {question.source}`. Pasting markdown into `explain` will show the brackets as characters until that line renders links.

Smallest change. Keep `explain` as a string. Add a function that replaces markdown links of the form `[label](https://...)` with an anchor, and use it only for `question.explain`. Allow `http` and `https`. Escape the rest of the string as text so the rest of the sentence cannot inject HTML. Open links with `target="_blank"` and `rel="noreferrer"`. Do not add a `sources` array. Do not add a markdown library. The `source` field can stay plain text. Its YouTube URL is already visible as text, and the section header in `App.tsx` already links the talk.

Apply the same renderer to `question.source` only if a later edit puts markdown links there. This pass does not require that.

## Appendix, other sections

No other Sowell Check section currently pairs a thin talk paraphrase with a cluster of outcome numbers in the way q04 does. Rent-control and wage-floor items in `economics` and `policy` stay qualitative. They name the mechanism and the book. They do not state a vacancy rate, a job-loss count, or a mobility percentage that is waiting on a link.

`economics-politics-race-1983` does put numbers in the explain line, and the source is still only the Firing Line tape. Examples are `econ-race-1983-q04` at an IQ of 106, `econ-race-1983-q05` at a 7-point rise per generation in Japan, and `econ-race-1983-q07` at 37 percent mulatto among free Black Americans. This pass did not verify those against a census table or an adoption study. Leave them on the talk until someone opens the underlying source. Do not rewrite them from memory.
