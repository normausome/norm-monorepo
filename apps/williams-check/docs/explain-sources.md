# Explanation sources

Checked 23 September 2026. This file is for the next edit of `apps/williams-check`. Do not treat it as a change to the quiz. `questions.json` and `App.tsx` stay as they are.

The quiz asks what Williams argued or what his biography records. The correct choice stays the choice that matches his text. The proposed `explain` strings keep that attribution, then add outside figures with links under the words "Outside research."

## Where the text lives

Each question in `apps/williams-check/src/data/questions.json` has `explain` and `source` as strings. `App.tsx` prints both as plain text. The feedback block is `<p className="text-muted-foreground">{question.explain}</p>` and a following line `Source: {question.source}`. A URL inside either string is not a link. `apps/williams-check` has no `src/lib/explain-links.ts`. `apps/sowell-check` has one, with a test file, since [PR #34](https://github.com/normausome/norm-monorepo/pull/34).

Section ids are `personal`, `economics`, `race-culture`, `education`, `policy`, and `books`, in `src/data/questions.ts`. The bank has 37 questions, `q1` through `q37`.

## Which questions this covers

Fact-heavy means the explain or the correct choice states a number, a statute, a study, an agency record, or a dated document that a reader could check outside Williams's own text. Those questions get a section below. Definitions, mechanisms, and paraphrases of an argument stay on Williams's text and are listed at the end under "Questions to leave short".

| Question | Section | Checkable claim | Status |
| --- | --- | --- | --- |
| q6 | policy | Davis-Bacon 1931 debate remarks, Black workers left federal construction | Verified attribution and Congressional Record citation. Exclusion is a historian's claim, not a series |
| q7 | books | Apartheid job-reservation laws existed and reserved skilled mine work | Verified through South African History Online and the O'Malley chronology. Book quoted through a 1990 review |
| q8 | economics | San Francisco and New York rent control, 1970s gasoline lines | Verified column text. Diamond, McQuade, and Qian, plus a Department of Energy account, added |
| q9 | economics | Flour ceiling in Economics for the Citizen, Part V | Verified at FEE. Capitalism Magazine numbering differs |
| q10 | economics | New York taxi license about $60,000, used car in the 1920s | Verified price against Schaller's series. Review is April 1983, not 1982 |
| q13 | policy | Job-reservation laws named elevators and machinery | Verified. Passenger-lift attendants were reserved under section 77 from 1963 to 1977 |
| q14 | economics | Missouri beautician exam pass rates by race | Verified in a 1983 review and Williams's 1980 essay. Book page and underlying study not read |
| q18 | personal | Date of death, final class | Verified. Notices split between December 1 and December 2, 2020 |
| q22 | education | Freeman, May 2005, semester off after two terms as chairman | Verified at FEE and in the Freeman scan |
| q25 | policy | Joint Economic Committee print, 6 July 1977 | Verified against the committee's own PDF |
| q29 | race-culture | 22 percent in 1960, more than 70 percent fifty years later | 1960 matches Census CH-3. 2010 does not. The 70-plus figure is a birth statistic |
| q30 | race-culture | Black labor-force activity 1890 to 1954, teen unemployment | Partial. 1954 participation holds. Teen rates hold only for males 16 to 17. 1890 to 1940 unverified |
| q33 | race-culture | 11 percent in 1938, about 75 percent now | 11 percent unverified. 75 percent is above NCHS 72.5 (2010) and 69.8 (2016) |

## Hosts that refuse non-browser clients

`cdc.gov`, `nytimes.com`, `upi.com`, `cato.org`, `jstor.org`, and the `doi.org` redirects into `tandfonline.com` returned HTTP 403 to curl and to a scripted fetch on 23 September 2026, with browser headers as well as without. For each of those pages the section below names the copy that was read, a Wayback capture or a mirror. The cdc.gov PDFs cited here have Wayback captures dated 26 August, 4 September, and 5 September 2026, so the live files existed this month. The proposed explains keep the live cdc.gov and doi.org addresses. Swap in the Wayback address if a later check finds a live one gone.

## Numbers that do not match the printed sources

- `q10`. The Commentary review that reports the used-car and $60,000 contrast is dated April 1983, not 1982. The book is 1982. The medallion price itself holds. Schaller's series puts an individual New York medallion at $60,000 in 1980 and 1981.
- `q29`. The 1960 figure of 22 percent matches Census table CH-3, where 21.9 percent of nonwhite children lived with one parent. The "more than 70 percent" fifty years later does not. CH-3 puts 53.3 percent of black children with one parent in 2010. The 70-plus figure matches NCHS births to unmarried non-Hispanic black mothers, 72.5 percent in 2010, which is a different measure.
- `q30`. BLS tables from 1948 and 1954 support "roughly equal to or less than" only for males aged 16 to 17. For males aged 18 to 19 and for teenage females the nonwhite rate was already higher. No race breakdown of labor-force participation for the censuses of 1890 to 1940 was read.
- `q33`. The 1938 encyclopedia figure of 11 percent was not found in print. The Census Bureau's own 1938 vital statistics give about 17 percent for "all other races" in an incomplete registration area. His "about 75 percent" is above the NCHS figures for his time, 72.5 percent in 2010 and 69.8 percent in 2016.
- `q9`. The flour passage is in FEE's Part V. The ten-part Capitalism Magazine version is numbered differently and its Part 5 has no flour example, so "also Capitalism Magazine" in the source line does not point at the passage.
- `q6`. The claim that Black workers left federal construction after 1931 comes from historians Bernstein cites. No employment series for covered projects was found.
- `q18`. The split between December 1 and December 2 is real. Hoover and the New York Times print Tuesday, December 1. The Wall Street Journal, UCLA, and the Washington Post print Wednesday, December 2. The Post quotes the university spokesman that his class ended at 10 p.m. on December 1.

## q6

Current explain. "In his columns he points to the legislative debate, including members of Congress and the AFL president objecting to Southern contractors who used lower-paid Black workers. He argues the law then shut those workers out of federal construction."

### Verified claims

- Williams, "Race and Economics," 31 August 2011, quotes Rep. John Cochran on "Southern contractors employing low-paid colored mechanics," Rep. Clayton Allgood on "cheap colored labor that he transports," and AFL president William Green, "Colored labor is being sought to demoralize wage rates." The column then says, "For decades after Davis-Bacon enactment, black workers on federally financed or assisted construction projects virtually disappeared."
- Williams, "Minimum Wage and Discrimination," 8 February 2017, repeats the Allgood and Green quotations. That column does not say Black workers left federal projects. The exit sentence is in the 2011 column.
- David E. Bernstein, Cato Briefing Paper No. 17, 18 January 1993, prints the Allgood remark with the citation Congressional Record, 28 February 1931, page 6513. Note 15 cites Cochran to House Committee on Labor hearings, 6 March 1930, pages 26 and 27. Note 24 cites Green to the Senate Committee on Manufactures, hearings on S. 5904, 3 February 1931, page 10. Bernstein's rendering of Green is "Colored labor is being brought in to demoralize wage rates." Williams's is "being sought to." The hearing transcript was not read.
- Bernstein's claim that the act produced "the almost complete exclusion of unskilled black workers from Davis-Bacon projects" rests on the histories he cites (Kruman, Hill, Thieblot). No agency series on Black employment on covered federal projects was found. PARTIAL.
- Kessler and Katz, NBER Working Paper 7454, 1999, find that repeal of state prevailing-wage laws between 1970 and 1993 narrowed the black and nonblack construction wage gap. That is later evidence on state laws, not on the 1931 federal act.

The quiz's "the AFL president objecting to Southern contractors" compresses two speakers. In Williams's text the Southern-contractor complaint is Cochran's and Allgood's. Green's remark is about wage rates.

### Sources

- Walter E. Williams, "Race and Economics," 31 August 2011. [walterewilliams.com](http://walterewilliams.com/race-and-economics/). HTTP 200 on the delegate's run. The host returned no answer to a first probe the same day, so keep the [Wayback capture](http://web.archive.org/web/20260120160429/http://walterewilliams.com/race-and-economics/) as backup. Same text syndicated as "Why the minimum wage keeps blacks jobless," [Washington Examiner](https://www.washingtonexaminer.com/news/365821/why-the-minimum-wage-keeps-blacks-jobless/). HTTP 200.
- Walter E. Williams, "Minimum Wage and Discrimination," 8 February 2017. [Creators Syndicate](https://www.creators.com/read/walter-williams/02/17/minimum-wage-and-discrimination). HTTP 200. Text read.
- David E. Bernstein, "The Davis-Bacon Act: Let's Bring Jim Crow to an End," Cato Institute Briefing Paper No. 17, 18 January 1993. [Cato](https://www.cato.org/briefing-paper/davis-bacon-act-lets-bring-jim-crow-end). HTTP 403 to curl, which cato.org returns to every non-browser client. The copy read was a PDF mirror at `http://www.leeconomics.com/Literature/bp017.pdf`, HTTP 200. Cato's 2023 policy analysis [Reforming Federal Laws on Private Sector Labor Unions](https://www.cato.org/policy-analysis/reforming-federal-laws-private-sector-labor-unions) repeats the Allgood quotation with the same Congressional Record citation.
- Daniel P. Kessler and Lawrence F. Katz, "Prevailing Wage Laws and Construction Labor Markets," [NBER Working Paper 7454](https://www.nber.org/papers/w7454). HTTP 200. Published in ILR Review 54(2), 2001.

The Congressional Record page for 28 February 1931 was not fetched. The 1931 Record is not on GovInfo. UNVERIFIED as a direct read. The citation is Bernstein's.

### Proposed explain

```
In his columns he points to the legislative debate, including members of Congress and the AFL president objecting to Southern contractors who used lower-paid Black workers. He argues the law then shut those workers out of federal construction. Outside research. Williams's column [Race and Economics](http://walterewilliams.com/race-and-economics/), 31 August 2011, quotes Rep. John Cochran on "Southern contractors employing low-paid colored mechanics," Rep. Clayton Allgood on "cheap colored labor," and AFL president William Green, then says black workers on federal construction "virtually disappeared" for decades. David Bernstein, Cato Briefing Paper No. 17, 1993, [The Davis-Bacon Act: Let's Bring Jim Crow to an End](https://www.cato.org/briefing-paper/davis-bacon-act-lets-bring-jim-crow-end), prints the Allgood remark with its citation, Congressional Record, 28 February 1931, page 6513, and Green's testimony to the Senate Committee on Manufactures, 3 February 1931. The exclusion claim rests on the histories Bernstein cites, not on an employment series. Kessler and Katz, [NBER Working Paper 7454](https://www.nber.org/papers/w7454), find that repeal of state prevailing-wage laws in 1970 to 1993 narrowed the black and nonblack construction wage gap, which is later evidence on related state laws, not on the 1931 act.
```

Confidence. High that Williams's columns contain the quoted remarks and the "virtually disappeared" sentence. High that Bernstein prints the Congressional Record citation. Low that any source measures how many Black workers left federal projects.

## q7

Current explain. "Williams argues apartheid was not a product of free markets. Job-reservation laws existed, in his account, because some employers would have hired Black workers at lower wages. He says racists could not trust markets to keep the color bar."

### Verified claims

- Matthew B. Kibbe's review in The Freeman, 1 October 1990, block-quotes the book: "South Africa's apartheid is not the corollary of free-market or capitalist forces. Apartheid is the result of anticapitalistic or socialistic efforts to subvert the operation of market (capitalistic) forces." And: "The presence of job reservation laws suggests that at least some employers would hire blacks in the 'white jobs.'" The passage continues that those employers found it attractive "because blacks were willing to work for lower wages," and "This is why South African white workers resorted to government." The review gives Praeger, 1989, 159 pages.
- Williams, "Discrimination and Segregation," 5 October 2016: "The bottom line is that racists cannot trust free markets to racially discriminate." The "lower wages" element is in the book passage as quoted by Kibbe, not in the column.
- South African History Online describes the Mines and Works Act No. 12 of 1911 as permitting "certificates of competency for a number of skilled mining occupations to Whites and Coloureds only," and the 1926 Mines and Works Amendment Act No. 25 (the Colour Bar Act) as re-enacting the bar after "mine owners continued to deskill jobs and give more and more work to Black miners to save labour costs." It dates the 1922 Rand strike to "the mine owners' attempt to replace a number of White workers with lower-paid Black workers."
- The O'Malley Archives chronology of apartheid legislation records that the Industrial Conciliation Act No. 28 of 1956 added "a new provision, s 77," which "provided for job reservation," in force from 1 January 1957.
- The book's own pages were not read. The archive.org copy is borrow-only and search-inside returned "Item not available."

### Sources

- Matthew B. Kibbe, "Book Review: South Africa's War Against Capitalism by Walter E. Williams," The Freeman, 1 October 1990. [FEE](https://fee.org/articles/book-review-south-africas-war-against-capitalism-by-walter-e-williams/). HTTP 200. Text read.
- Walter E. Williams, "Discrimination and Segregation," 5 October 2016. [Creators Syndicate](https://www.creators.com/read/walter-williams/10/16/discrimination-and-segregation). HTTP 200. Text read. Also at [walterewilliams.com](http://walterewilliams.com/discrimination-and-segregation/), HTTP 200 on the delegate's run, with a [Wayback capture](http://web.archive.org/web/20220919221700/http://walterewilliams.com/discrimination-and-segregation/).
- South African History Online, "Apartheid Legislation 1850s-1970s." [sahistory.org.za](https://sahistory.org.za/article/apartheid-legislation-1850s-1970s). HTTP 403 to curl. Text read through the fetch tool. [Wayback capture, 7 September 2026](http://web.archive.org/web/20260907182050/https://sahistory.org.za/article/apartheid-legislation-1850s-1970s).
- Padraig O'Malley, "Chronology of Apartheid Legislation," O'Malley Archives, Nelson Mandela Foundation. [omalley.nelsonmandela.org](https://omalley.nelsonmandela.org/index.php/site/q/03lv02167/04lv02264/05lv02335/06lv02357/07lv02359/08lv02371.htm). HTTP 200. Text read.
- Walter E. Williams, South Africa's War Against Capitalism, Praeger, 1989. [archive.org record](https://archive.org/details/southafricaswara00will). Borrow-only. Not read.
- Damon Root, "Man vs. the State," Reason, 28 April 2011, repeats the job-reservation argument. [Reason](https://reason.com/2011/04/28/man-vs-the-state/). HTTP 200. Secondary.

### Proposed explain

```
Williams argues apartheid was not a product of free markets. Job-reservation laws existed, in his account, because some employers would have hired Black workers at lower wages. He says racists could not trust markets to keep the color bar. Outside research. Matthew Kibbe's 1990 Freeman review, [South Africa's War Against Capitalism](https://fee.org/articles/book-review-south-africas-war-against-capitalism-by-walter-e-williams/), quotes the book: "The presence of job reservation laws suggests that at least some employers would hire blacks in the 'white jobs,'" and "This is why South African white workers resorted to government." The laws are real. South African History Online, [Apartheid Legislation 1850s-1970s](https://sahistory.org.za/article/apartheid-legislation-1850s-1970s), describes the Mines and Works Act of 1911 and the 1926 Colour Bar Act as reserving skilled mine work for whites after mine owners kept moving work to lower-paid Black miners. The O'Malley Archives [chronology of apartheid legislation](https://omalley.nelsonmandela.org/index.php/site/q/03lv02167/04lv02264/05lv02335/06lv02357/07lv02359/08lv02371.htm) records section 77 of the Industrial Conciliation Act of 1956 as the job-reservation provision.
```

Confidence. High that the review prints those sentences from the book and that the statutes existed as described. Medium on the exact wording of the book's thesis, since the book itself was not opened.

## q8

Current explain. "In 'Compassion Versus Reality' he says rent controls aimed at affordable housing, and price controls aimed at price-gouging, produce a worse mess. He names San Francisco and New York as costly rent-controlled markets and recalls the 1970s gasoline lines."

### Verified claims

- The column, dated 5 June 2007 on creators.com and 6 June 2007 on other mirrors, prints: "whatever politicians do, whether it's rent controls to produce 'affordable' housing, or price controls to eliminate 'price-gouging,' the result is a calamity worse than the original problem. For example, two of the most costly housing markets are the rent-controlled cities of San Francisco and New York." And: "If you're over 40, you'll remember the chaos produced by the gasoline price controls of the 1970s."
- "Gas Prices and Price Controls," Capitalism Magazine, 7 December 2005: "Think back to the gasoline price controls during the 1970s. The price controls caused shortages."
- Diamond, McQuade, and Qian, NBER Working Paper 24181, January 2018, abstract: "Landlords treated by rent control reduced rental housing supply by 15%, causing a 5.1% city-wide rent increase." The American Economic Review version, 2019, keeps the 15 percent and says the lost supply "likely drove up market rents in the long run." The AER abstract does not print 5.1 percent.
- Glaeser and Luttmer, American Economic Review, 2003, abstract: in New York "an economically and statistically significant fraction of apartments appears to be misallocated across demographic subgroups." The 21 percent figure is in the paper body, which is paywalled. It was seen only as quoted in NBER Working Paper 26015, note 25. PARTIAL.
- National Petroleum Council, 1995, hosted by the Department of Energy: "The embargo combined with federal price and allocation controls to create product dislocations and shortages-the infamous 'gasoline lines.'" The 1979 Iranian revolution "caused more 'gasoline lines.'"

Williams does not use the word "shortage" in the 2007 column. He does in the 2005 column. The quiz's "a market that stays costly for people who cannot get a controlled unit" glosses "two of the most costly housing markets."

### Sources

- Walter E. Williams, "Compassion Versus Reality," 5 June 2007. [Creators Syndicate](https://www.creators.com/read/walter-williams/06/07/compassion-versus-reality). HTTP 200. Text read. [Wayback capture](http://web.archive.org/web/20250819012714/https://www.creators.com/read/walter-williams/06/07/compassion-versus-reality).
- Walter E. Williams, "Gas Prices and Price Controls," Capitalism Magazine, 7 December 2005. [Capitalism Magazine](https://capitalismmagazine.com/2005/12/gas-prices-and-price-controls/). HTTP 200. Text read.
- Rebecca Diamond, Tim McQuade, and Franklin Qian, "The Effects of Rent Control Expansion on Tenants, Landlords, and Inequality: Evidence from San Francisco." [NBER Working Paper 24181](https://www.nber.org/papers/w24181). HTTP 200. Abstract read. Journal version: [American Economic Review 109(9), 2019](https://www.aeaweb.org/articles?id=10.1257/aer.20181289). HTTP 200. Abstract read.
- Edward L. Glaeser and Erzo F. P. Luttmer, "The Misallocation of Housing Under Rent Control," [American Economic Review 93(4), 2003](https://www.aeaweb.org/articles?id=10.1257/000282803769206188). HTTP 200. Abstract only. The [NBER Working Paper 6220](https://www.nber.org/papers/w6220) abstract gives a different headline, about $200 per apartment per year in misallocation cost.
- National Petroleum Council, "Future Issues: A View of U.S. Oil and Natural Gas to 2020," 1995. [Department of Energy PDF](https://www.energy.gov/sites/default/files/2022-11/eo1995-Future_Issues-View_of_US_Oil_n_Natural_Gas_to_2020.pdf). HTTP 200. Sentence read.

### Proposed explain

```
In "Compassion Versus Reality" he says rent controls aimed at affordable housing, and price controls aimed at price-gouging, produce a worse mess. He names San Francisco and New York as costly rent-controlled markets and recalls the 1970s gasoline lines. Outside research. The column is [Compassion Versus Reality](https://www.creators.com/read/walter-williams/06/07/compassion-versus-reality), June 2007. Diamond, McQuade, and Qian, [NBER Working Paper 24181](https://www.nber.org/papers/w24181), find that San Francisco landlords brought under rent control in 1994 cut rental supply by 15 percent, and the working paper puts the citywide rent increase at 5.1 percent. Glaeser and Luttmer, [American Economic Review, 2003](https://www.aeaweb.org/articles?id=10.1257/000282803769206188), find a significant share of New York apartments misallocated under rent control. A 1995 National Petroleum Council report hosted by the [Department of Energy](https://www.energy.gov/sites/default/files/2022-11/eo1995-Future_Issues-View_of_US_Oil_n_Natural_Gas_to_2020.pdf) says the 1973 embargo "combined with federal price and allocation controls" to produce the gasoline lines, and that 1979 brought more.
```

Confidence. High on the column text, the 15 percent supply cut, and the Department of Energy sentence. Medium on 5.1 percent, which is in the working-paper abstract and not the journal abstract. The 21 percent misallocation figure is left out of the proposed explain because it was not read in the paper.

## q9

Current explain. "In Economics for the Citizen he uses a flour ceiling as the example. If the controlled price does not pay for extra output, suppliers do not expand, and people trade at illegal prices."

### Verified claims

- FEE's "Economics for the Citizen: Part V," dated 1 August 2006 on fee.org, prints: "What if politicians thought that flour prices were too high and enacted flour price controls in the wake of a surge in demand for bakery products? Would wheat farmers put more land under cultivation? Would millers work overtime to produce more flour? The answer is a big fat no because what would be in it for them? The result would be flour shortages ... If there were flour price controls, we'd see black markets emerging, people buying and selling flour at illegal prices."
- The Freeman ran the series in five parts. The syndicated version on Capitalism Magazine ran ten parts in January 2005 with different numbering. Capitalism Magazine's "Part 5," 16 January 2005, has no flour passage. The quiz's source line "Part V (FEE; also Capitalism Magazine)" is right about FEE and misleading about Capitalism Magazine.

### Sources

- Walter E. Williams, "Economics for the Citizen: Part V," The Freeman. [FEE](https://fee.org/articles/economics-for-the-citizen-part-v/). HTTP 200. Text read. [Wayback capture](http://web.archive.org/web/20260122105433/https://fee.org/articles/economics-for-the-citizen-part-v/).
- Walter Williams, "Economics for the Citizen (Part 5)," Capitalism Magazine, 16 January 2005. [Capitalism Magazine](https://capitalismmagazine.com/2005/01/economics-for-the-citizen-part-5/). HTTP 200. Checked for "flour". Not present.

### Proposed explain

```
In Economics for the Citizen he uses a flour ceiling as the example. If the controlled price does not pay for extra output, suppliers do not expand, and people trade at illegal prices. Outside research. The passage is in [Economics for the Citizen: Part V](https://fee.org/articles/economics-for-the-citizen-part-v/) at FEE. "Would wheat farmers put more land under cultivation? Would millers work overtime to produce more flour? The answer is a big fat no because what would be in it for them?" He then predicts flour shortages and black markets. The Freeman printed the series in five parts. The ten-part syndicated version has different numbering, and its Part 5 does not contain the flour example.
```

Confidence. High. The passage was read at FEE. This is an attribution check, not an outside study. The proposed explain adds the link and the numbering caveat only.

## q10

Current explain. "The State Against Blacks treats taxicab licensing in New York, Philadelphia, and Washington as an entry barrier. A 1982 review of the book reports his contrast. In the 1920s a poor person could start with a used car. By the time of the book, a New York license cost about $60,000."

### Verified claims

- Michael Novak's review in Commentary is dated April 1983, not 1982. It says the book covers "the taxicab industry in New York, Philadelphia, and Washington, D.C." and: "in the 1920's, an uneducated poor person in New York could purchase a used car and operate it as a taxi; today, Williams notes, a license to do so would set him back $60,000."
- John Chamberlain's review in The Freeman, 1983, says "A cab medallion in New York now commands a market price of $60,000," that "There were 13,566 medallions issued in 1937, sold at $10 a throw," and that in Washington "a poor black can set up in business with his own cab if he raises $25 for a license and $5,000 for the cab and insurance."
- UPI, 28 November 1982, quotes Williams on the new book: in Philadelphia "it can cost $20,000 to $40,000 to buy a taxi medallion" and "In Washington, you can get a license to own and operate a taxi for $200."
- Bruce Schaller, The New York City Taxicab Fact Book, March 2006, Table 4, gives average individual medallion prices of $60,000 in 1980, $60,000 in 1981, $57,500 in 1982, and $68,600 in 1983. Corporate medallions were about $50,000. The PDF was downloaded and the rows read.
- Anne G. Morris, Transportation Research Record 1103, 1986, gives "the reported cost of $50,000 to $60,000 in 1981."
- Schaller's history section, citing Gilbert and Samuels, The Taxicab: An Urban Transportation Survivor, 1982, says the 1937 Haas Act "froze the number of taxi licenses at 13,595," and that in the 1920s and 1930s "easy entry into this all-cash business led to an oversupply of taxis," with 21,000 cabs by 1931. There were no medallions before 1937, so a 1920s used car was the whole entry cost.
- The book's taxicab chapter was not read. The archive.org copy is borrow-only.

### Sources

- Michael Novak, "The State Against Blacks, by Walter E. Williams," Commentary, April 1983. [Commentary](https://www.commentary.org/articles/michael-novak-2/the-state-against-blacks-by-walter-e-williams/). HTTP 200. Text read.
- John Chamberlain, "A Reviewer's Notebook: The State Against Blacks," The Freeman, 1983. [FEE](https://fee.org/articles/a-reviewers-notebook-the-state-against-blacks/). HTTP 200. Text read.
- UPI, "New questions emerge on causes; Class differences now blame," 28 November 1982. [UPI archive](https://www.upi.com/Archives/1982/11/28/New-questions-emerge-on-causesNEWLNClass-differences-now-blame/6609407307600/). HTTP 200. Text read.
- Bruce Schaller, "The New York City Taxicab Fact Book," March 2006. [Schaller Consulting PDF](https://www.schallerconsult.com/taxi/taxifb.pdf). HTTP 200. PDF downloaded and Table 4 read. Companion page on the Haas Act: [NY's Taxi Medallion System](https://www.schallerconsult.com/taxi/taxi2.htm). HTTP 200.
- Anne G. Morris, "Taxi School: A First Step in Professionalizing Taxi Driving," Transportation Research Record 1103, 1986. [TRB PDF](https://onlinepubs.trb.org/Onlinepubs/trr/1986/1103/1103-010.pdf). HTTP 200.
- Walter E. Williams, The State Against Blacks, 1982. [archive.org record](https://archive.org/details/stateagainstblac00will). Borrow-only. Not read.

### Proposed explain

```
The State Against Blacks treats taxicab licensing in New York, Philadelphia, and Washington as an entry barrier. Michael Novak's April 1983 review reports his contrast. In the 1920s a poor person could start with a used car. By the time of the book, a New York license cost about $60,000. Outside research. The review is [The State Against Blacks, by Walter E. Williams](https://www.commentary.org/articles/michael-novak-2/the-state-against-blacks-by-walter-e-williams/) in Commentary. Bruce Schaller's [New York City Taxicab Fact Book](https://www.schallerconsult.com/taxi/taxifb.pdf), Table 4, puts the average individual medallion at $60,000 in 1980 and 1981 and $57,500 in 1982. A 1986 [Transportation Research Record paper](https://onlinepubs.trb.org/Onlinepubs/trr/1986/1103/1103-010.pdf) reports $50,000 to $60,000 in 1981. The 1937 Haas Act froze the license count at 13,595, per Schaller's history page, [NY's Taxi Medallion System](https://www.schallerconsult.com/taxi/taxi2.htm). Before 1937 there were no medallions, and Schaller records 21,000 cabs on the street by 1931 under open entry.
```

Confidence. High on the $60,000 figure for 1980 to 1981 and on the Haas Act cap. High that the Commentary review is dated April 1983. The current explain and source line say 1982, which is the book's year, not the review's. Medium that the book's own page states the used-car contrast in those words, since only the reviews were read.

## q13

Current explain. "In 'Discrimination and Segregation' he notes South African job-reservation laws for work such as running elevators and supervising machinery. He argues racists cannot trust free markets to keep those jobs white."

### Verified claims

- The 5 October 2016 column lists "blasting, running elevators, driving engines, supervising boilers and other machinery, supervising people's shifts, and overseeing mines," asks "why in the world would a law banning them from doing so be necessary?", and ends "The bottom line is that racists cannot trust free markets to racially discriminate."
- A University of Cape Town dissertation by Tom Magara Njeru, 2014, citing Doxey and Simons and Simons, lists the occupations reserved under the 1926 act as "mine manager, overseer, surveyor, engineer, assayer, blaster, winding engine driver, boiler attendant and lampman," and the 1906 regulation list as including "boiler attendant, lift operator, shift boss, surface foreman, mine overseer and mechanical engineer." Those match Williams's list.
- Elevators were reserved by statute outside the mines too. Mariotti and van Zyl-Hermann, Economic History of Developing Regions, 2014, cite Determination No. 5 under section 77, "Passenger Lift Attendants in the Municipal Areas of Bloemfontein, Johannesburg and Pretoria," Government Gazette, 6 December 1963, renewed 30 December 1977. A Stellenbosch seminar report on Bridget Kenny's work says "the job of lift operator was reserved for whites from 1960 to 1977" in those cities and that section 77 produced 28 reservations across 13 sectors.
- Williams frames the elevators as mine elevators. The statutory lift reservation found concerns passenger lifts in city buildings. Mine "lift operator" and "winding engine driver" appear in the mining regulation lists. Both support his general claim. The column does not name the statute he had in mind.
- Section 77 was repealed by the Industrial Conciliation Amendment Act 94 of 1979.

### Sources

- Walter E. Williams, "Discrimination and Segregation," 5 October 2016. [Creators Syndicate](https://www.creators.com/read/walter-williams/10/16/discrimination-and-segregation). HTTP 200. Text read.
- Tom Magara Njeru, "Persistent Reservations in Mining?", University of Cape Town, 2014. Handle `http://hdl.handle.net/11427/8511`. The handle redirects to open.uct.ac.za, which did not answer curl or the fetch tool, and Wayback has no capture. Text read through the search tool only. Left out of the proposed explain for that reason.
- Martine Mariotti and Danelle van Zyl-Hermann, "Policy, practice and perception: Reconsidering the efficacy and meaning of statutory job reservation in South Africa, 1956-1979," Economic History of Developing Regions, 2014. [DOI 10.1080/20780389.2014.955273](https://doi.org/10.1080/20780389.2014.955273). HTTP 403 to curl at the publisher. Reference list and abstract read from a copy on academia.edu.
- Stellenbosch Institute for Advanced Study, seminar report on Bridget Kenny, "How to fix a lift." [STIAS](https://www.stias.ac.za/public-lectures-seminars/how-to-fix-a-lift-the-political-intimacies-of-elevators-in-20th-century-johannesburg/). HTTP 200. Text read. Kenny's article is "To protect white men: job reservation in elevators in South Africa in the 1950s and 1960s," Social History, 2020, [DOI 10.1080/03071022.2020.1812304](https://doi.org/10.1080/03071022.2020.1812304), abstract only.
- O'Malley Archives chronology, as in q7.

### Proposed explain

```
In "Discrimination and Segregation" he notes South African job-reservation laws for work such as running elevators and supervising machinery. He argues racists cannot trust free markets to keep those jobs white. Outside research. The column is [Discrimination and Segregation](https://www.creators.com/read/walter-williams/10/16/discrimination-and-segregation), 5 October 2016, and its list is blasting, running elevators, driving engines, supervising boilers and other machinery, supervising shifts, and overseeing mines. The mining bar is the Mines and Works Act of 1911 and its 1926 amendment, which South African History Online, [Apartheid Legislation 1850s-1970s](https://sahistory.org.za/article/apartheid-legislation-1850s-1970s), describes as limiting certificates of competency for skilled mining occupations to whites and Coloureds. Elevators were also reserved by name outside the mines. Determination No. 5 under section 77 of the Industrial Conciliation Act of 1956 reserved passenger lift attendants in Johannesburg, Pretoria, and Bloemfontein for whites from 1963 to 1977, as cited by Mariotti and van Zyl-Hermann, [Economic History of Developing Regions, 2014](https://doi.org/10.1080/20780389.2014.955273), and described in a [Stellenbosch seminar report on Bridget Kenny's research](https://www.stias.ac.za/public-lectures-seminars/how-to-fix-a-lift-the-political-intimacies-of-elevators-in-20th-century-johannesburg/).
```

Confidence. High on the column text and on the existence of section 77 and the lift determination. Medium on the reserved-occupation lists, which come from a dissertation citing older scholarship rather than a scanned statute, and whose host could not be reached for a link check.

## q14

Current explain. "Reviewers of The State Against Blacks describe his Missouri beautician example. Applicants faced a written portion and a performance portion. The written portion, not the practical one, drove a racial gap in who passed. His point is the effect of the rule."

### Verified claims

- Susan Love Brown, Reason, June 1983, reviewing The State Against Blacks: "Only 3 percent of the successful exam takers are black, while some 21 percent of those failing the exam are black." Blacks "score 10 points less than whites of comparable education on the written exam." "There is no significant statistical difference in success or failure rates of blacks and whites on the performance part of the exam." Read on 23 September 2026.
- Williams, "The Poor as First Victims of the Welfare State," Imprimis, July 1980, names the study. "Stuart Dorsey did an unpublished study of the licensing of cosmetologists in Illinois and Missouri. He found that in both states, the failure rate for blacks was about four times that of whites." On the practical part "the pass rate for everyone was about 96%." The written portion is where "blacks had a high failure rate."
- Clint Bolick, "The Reincarnation of Jim Crow," FEE, repeats the 3 percent and 21 percent figures and attributes them to Williams's book. Secondary.
- Stuart Dorsey, "The Occupational Licensing Queue," Journal of Human Resources 15(3), 1980, pages 424 to 434, is the published study. Paywalled. Not read. A 2018 Supreme Court amicus brief in Niang v. Carroll quotes Dorsey's 1983 follow-up in Law and Human Behavior: black cosmetology test-takers in Missouri and Illinois "failed three times as often as non-black test-takers." Williams's 1980 essay says about four times. The two Dorsey papers differ, so the multiple stays uncertain.

The book's own page was not read. The archive.org copy is borrow-only and search-inside returned "Item not available." The figures above come from the review, Williams's essay, and the FEE summary.

### Sources

- Susan Love Brown, "Government the Problem, Not the Panacea," Reason, June 1983. [Reason](https://reason.com/1983/06/01/government-the-problem-not-the/). HTTP 200. Text read and the passage confirmed by a second fetch.
- Walter E. Williams, "The Poor as First Victims of the Welfare State," Imprimis, July 1980, reprinted 2 February 2022. [Northwood University](https://www.northwood.edu/news/timeless-values-the-poor-as-first-victims-of-the-welfare-state/). HTTP 200. Text read.
- Clint Bolick, "The Reincarnation of Jim Crow." [FEE](https://fee.org/articles/the-reincarnation-of-jim-crow/). HTTP 200. Secondary.
- Stuart Dorsey, "The Occupational Licensing Queue," Journal of Human Resources, 1980. [JSTOR 145292](https://www.jstor.org/stable/145292). Landing page only. Paywalled.
- Public Choice Scholars amicus brief, Niang v. Carroll, No. 17-1428, 10 May 2018. [Supreme Court docket PDF](https://www.supremecourt.gov/DocketPDF/17/17-1428/46438/20180510151804293_Public%20Choice%20Scholars%20Amicus%20Brief.pdf). HTTP 200. Text read. Quotes Dorsey 1983.
- Walter E. Williams, The State Against Blacks, 1982. [archive.org record](https://archive.org/details/stateagainstblac00will). Borrow-only. Not read.

### Proposed explain

```
Reviewers of The State Against Blacks describe his Missouri beautician example. Applicants faced a written portion and a performance portion. The written portion, not the practical one, drove a racial gap in who passed. His point is the effect of the rule. Outside research. Susan Love Brown's June 1983 review, [Government the Problem, Not the Panacea](https://reason.com/1983/06/01/government-the-problem-not-the/), gives his figures. Blacks were 3 percent of those who passed and 21 percent of those who failed, scored about 10 points lower on the written test at comparable education, and showed no significant difference on the performance test. Williams's 1980 Imprimis essay, [The Poor as First Victims of the Welfare State](https://www.northwood.edu/news/timeless-values-the-poor-as-first-victims-of-the-welfare-state/), names the study as Stuart Dorsey's work on Missouri and Illinois cosmetology exams, with a practical pass rate near 96 percent for everyone. Dorsey's published version is [The Occupational Licensing Queue](https://www.jstor.org/stable/145292), Journal of Human Resources, 1980, which this pass could not read.
```

Confidence. High that the 1983 review and the 1980 essay print those figures. Medium that the book prints the same numbers, since its page was not read. Low on the exact failure multiple, which is four times in Williams's essay and three times in a 2018 brief's summary of Dorsey's 1983 paper.

## q18

Current explain. "Hoover's 2021 profile dates his death December 1, 2020. A Wall Street Journal tribute quoted by UCLA says he died the morning after teaching his final class, at 84. Those notices do not use the same calendar day, so the shared facts are the year, his age, and that he had just taught at George Mason."

### Verified claims

- Hoover, 5 February 2021: "From 1980 until he passed away on December 1, 2020, Williams was the John M. Olin Distinguished Professor at George Mason University." Hoover, 8 December 2020: "died on Tuesday, December 1. He was 84."
- UCLA Economics, 2 December 2020, quoting the Wall Street Journal: "Walter Williams died Wednesday morning after teaching his final class at George Mason University on Tuesday. He was 84." Boudreaux's tribute is dated 2 December 2020 at the Journal and reprinted at Cafe Hayek.
- New York Times, 4 December 2020: "died on Tuesday on the campus of George Mason University," "He was 84," "born on March 31, 1936, in Philadelphia." His daughter said "he died suddenly in his car after he had finished teaching a class."
- Washington Post, 4 December 2020: "died Dec. 2 in Arlington, Va." University spokesman Michael Sandler said he "taught a graduate course in microeconomics on GMU's Arlington campus that ended at 10 p.m. on Dec. 1. Several hours later, police found him unresponsive in his car in a university parking lot." Born March 31, 1936.
- George Mason's dean's statement of 2 December 2020 gives no date of death or birth and says he "was 84 and still active on campus up until the time of his death."

The split is real. Hoover and the Times say Tuesday, 1 December. The Journal, UCLA, and the Post say Wednesday, 2 December. The class on the evening of 1 December is in the Journal, the Times, and the Post's account from the university spokesman.

### Sources

- Hoover Institution, "Black History Month Profile: Walter Williams," 5 February 2021. [hoover.org/news/walter-williams](https://www.hoover.org/news/walter-williams). HTTP 200.
- Hoover Institution, "Walter E. Williams, 1936-2020," 8 December 2020. [hoover.org](https://www.hoover.org/news/walter-e-williams-1936-2020). HTTP 200.
- UCLA Economics, "Walter Williams, UCLA Ph.D.," 2 December 2020. [economics.ucla.edu](https://economics.ucla.edu/walter-williams-ucla-ph-d/). HTTP 200. Text read.
- Donald J. Boudreaux, "Walter Williams, R.I.P.," Wall Street Journal, 2 December 2020. The Journal URL returned HTTP 401. Reprint: [Cafe Hayek, 16 June 2021](https://cafehayek.com/2021/06/my-tribute-to-the-late-great-walter-williams.html). HTTP 403 to curl. Read through the fetch tool. [Wayback capture](http://web.archive.org/web/20251201095627/https://cafehayek.com/2021/06/my-tribute-to-the-late-great-walter-williams.html).
- Robert D. Hershey Jr., "Walter E. Williams, 84, Dies; Conservative Economist on Black Issues," New York Times, 4 December 2020. [nytimes.com](https://www.nytimes.com/2020/12/04/business/economy/walter-e-williams-dead.html). HTTP 403 to curl. Read from the [Wayback capture](http://web.archive.org/web/20250616221904/https://www.nytimes.com/2020/12/04/business/economy/walter-e-williams-dead.html).
- Matt Schudel, Washington Post, 4 December 2020. [washingtonpost.com](https://www.washingtonpost.com/local/obituaries/walter-williams-dead/2020/12/04/5bafc0bc-364a-11eb-8d38-6aea1adb3839_story.html). Did not answer curl. Read from a Wayback capture dated 6 March 2023.
- George Mason University, "Appreciation for Dr. Walter Williams: Statement of Dean Ann Ardis," 2 December 2020. [chss.gmu.edu](https://chss.gmu.edu/articles/15237). HTTP 200. Department tribute: [economics.gmu.edu](https://economics.gmu.edu/articles/15240). HTTP 200.

### Proposed explain

```
Hoover's 2021 profile dates his death December 1, 2020. A Wall Street Journal tribute quoted by UCLA says he died the morning after teaching his final class, at 84. Those notices do not use the same calendar day, so the shared facts are the year, his age, and that he had just taught at George Mason. Outside research. Hoover's [profile](https://www.hoover.org/news/walter-williams) and its [8 December 2020 notice](https://www.hoover.org/news/walter-e-williams-1936-2020) say Tuesday, December 1. [UCLA Economics](https://economics.ucla.edu/walter-williams-ucla-ph-d/) quotes the Journal: "died Wednesday morning after teaching his final class at George Mason University on Tuesday." The Washington Post gives December 2 and quotes a university spokesman that his class ended at 10 p.m. on December 1. The New York Times gives Tuesday and reports his daughter's account that he died in his car after teaching. George Mason's own [dean's statement](https://chss.gmu.edu/articles/15237) gives no date. The Times and the Post both give his birth date as March 31, 1936.
```

Confidence. High on every date as each notice prints it. The Journal, the Times, and the Post were read from reprints or archive captures, not from their paywalled pages.

## q22

Current explain. "In the May 2005 Freeman piece he says the semester off was his reward for two terms as chairman at George Mason, and that he used it to write basic lectures for general readers. The first lesson he states is scarcity."

### Verified claims

- FEE's "Economics for the Citizen," dated 1 May 2005: "For the first time in 37 years, last fall semester I didn't teach. No, I haven't retired. It was my semester-off reward for two terms as department chairman at George Mason University." Then: "deliver a few lectures on basic economic principles to readers. We'll name the series 'Economics for the Citizen.'" And: "The first lesson in economic theory is that we live in a world of scarcity. Scarcity is a situation whereby human wants exceed the means to satisfy those wants."
- The scanned Freeman PDF on walterewilliams.com carries the running head "47 MAY 2005" and the same opening.
- The series first ran as syndicated columns in January 2005. Capitalism Magazine's Part 1, 12 January 2005, opens with the same scarcity sentence. The Freeman printing began May 2005.
- He chaired the department from 1995 to 2001 per the Hoover profile and the GMU statements. "Two terms" is his phrase and was not checked against GMU records.

### Sources

- Walter E. Williams, "Economics for the Citizen," The Freeman, May 2005. [FEE](https://fee.org/articles/economics-for-the-citizen/). HTTP 200. Text read. Freeman scan: [May05.pdf on walterewilliams.com](http://walterewilliams.com/publications/freeman/May05.pdf). HTTP 200 on http. The https form did not answer. [Wayback capture of the scan](http://web.archive.org/web/20201202171959/http://walterewilliams.com/publications/freeman/May05.pdf).
- Walter Williams, "Economics for the Citizen (Part 1)," Capitalism Magazine, 12 January 2005. [Capitalism Magazine](https://capitalismmagazine.com/2005/01/economics-for-the-citizen-part-1/). HTTP 200.

### Proposed explain

```
In the May 2005 Freeman piece he says the semester off was his reward for two terms as chairman at George Mason, and that he used it to write basic lectures for general readers. The first lesson he states is scarcity. Outside research. The piece is [Economics for the Citizen](https://fee.org/articles/economics-for-the-citizen/) at FEE, and the Freeman scan with the May 2005 running head is [May05.pdf](http://walterewilliams.com/publications/freeman/May05.pdf). "For the first time in 37 years, last fall semester I didn't teach," he writes, and "The first lesson in economic theory is that we live in a world of scarcity." The same text ran first as a ten-part syndicated series in January 2005, starting with [Part 1 at Capitalism Magazine](https://capitalismmagazine.com/2005/01/economics-for-the-citizen-part-1/). Hoover and George Mason date his chairmanship to 1995 to 2001.
```

Confidence. High on every sentence. The only unchecked item is whether 1995 to 2001 was formally two terms.

## q25

Current explain. "The committee print of July 6, 1977 is Youth and Minority Unemployment, by Walter E. Williams. It reviews minimum wages, union rules, the Davis-Bacon Act, licensing, schooling, and manpower policy. Hoover's later profile ties the minimum-wage and Davis-Bacon research to his national fellowship there in the mid-1970s. The profile misspells the statute Davis-Beacon. The print uses Davis-Bacon."

### Verified claims

- The Joint Economic Committee hosts the print. The URL has its parentheses percent-encoded so the markdown link parser does not stop at the first close paren. Title page: "95th Congress, 1st Session, Joint Committee Print, Youth and Minority Unemployment, a study prepared for the use of the Joint Economic Committee," sponsored by Senators James A. McClure and Orrin G. Hatch and Representatives Clarence J. Brown and John H. Rousselot, "July 6, 1977," print number 89-825. Chairman Richard Bolling's transmittal letter names "Walter E. Williams." The author footnote reads "Associate professor, Department of Economics, Temple University."
- The sponsors' letter of 27 June 1977 says the study "reviews some of the current literature on the effects of minimum wages on minority and youth unemployment" and "surveys the possible adverse results from the market control of unions, the Davis-Bacon Act, job discrimination, licensure, inadequate educational skills, and present manpower policies." The contents list Minimum wage laws (page 5), Unions (13), The Davis-Bacon Act (15), Licensure (16), Education (17), and Effects of past manpower policies (19).
- The print spells the statute "Davis-Bacon" and dates it "March 31, 1931."
- ERIC record ED155250 catalogs the same title, author, and date, 6 July 1977.
- The Hoover Institution profile of 5 February 2021 says Williams "was a national fellow at the Hoover Institution during the academic year of 1975-76" and that "when Williams was a national fellow at Hoover in the mid-1970s, he was commissioned by the Joint Economic Committee of the US Congress to conduct a study on minimum-wage laws and the Davis-Beacon Act of 1931." The string "Davis-Bacon" does not appear on that page.
- Williams's own publications list records the JEC print and a 1977 Hoover Institution Press edition described as "an unexpurgated version of the Joint Economic Committee report." Open Library's note on the Hoover edition says it "contains material deleted at the request of the committee."

### Sources

- Joint Economic Committee, "Youth and Minority Unemployment," Joint Committee Print 89-825, 6 July 1977. [JEC PDF](https://www.jec.senate.gov/reports/95th%20Congress/Youth%20and%20Minority%20Unemployment%20%28842%29.pdf). HTTP 200. Full PDF text read, and the title page re-read from a second download on 23 September 2026.
- ERIC record [ED155250](https://eric.ed.gov/?id=ED155250). HTTP 200 from the fetch tool. The VM's own egress could not reach eric.ed.gov.
- Hoover Institution, "Black History Month Profile: Walter Williams," 5 February 2021. [hoover.org/news/walter-williams](https://www.hoover.org/news/walter-williams). HTTP 200. Text read.
- Walter E. Williams, publications page. [walterewilliams.com](http://walterewilliams.com/publications/publications/). HTTP 200 on the delegate's run.
- Hoover Institution Press edition, 1977. [archive.org record](https://archive.org/details/youthminorityune0000will). Borrow-only. Not read.

### Proposed explain

```
The committee print of July 6, 1977 is Youth and Minority Unemployment, by Walter E. Williams. It reviews minimum wages, union rules, the Davis-Bacon Act, licensing, schooling, and manpower policy. Hoover's later profile ties the minimum-wage and Davis-Bacon research to his national fellowship there in the mid-1970s. The profile misspells the statute Davis-Beacon. The print uses Davis-Bacon. Outside research. The Joint Economic Committee hosts the [print as a PDF](https://www.jec.senate.gov/reports/95th%20Congress/Youth%20and%20Minority%20Unemployment%20%28842%29.pdf). The title page carries the date and print number 89-825, the author footnote places him at Temple University, and the contents list Minimum wage laws, Unions, The Davis-Bacon Act, Licensure, Education, and Effects of past manpower policies. ERIC catalogs it as [ED155250](https://eric.ed.gov/?id=ED155250). The Hoover profile is [Black History Month Profile: Walter Williams](https://www.hoover.org/news/walter-williams), which dates the fellowship to 1975 to 1976 and spells the act Davis-Beacon. Hoover Institution Press also issued a 1977 edition that his publications list calls an unexpurgated version of the committee report.
```

Confidence. High on the title, date, author, contents, and spelling in the print. High on the Hoover profile's wording. Medium on the profile's link between the fellowship year and the commission, since the print itself does not mention Hoover.

## q29

Current explain. "The September 20, 2017 column says that in 1960, 22 percent of black children were raised in single-parent families, and that fifty years later the share was more than 70 percent. He poses the slavery-or-welfare-state question in those words."

### Verified claims

- The column prints: "In 1960, just 22 percent of black children were raised in single-parent families. Fifty years later, more than 70 percent of black children were raised in single-parent families. Here's my question: Was the increase in single-parent black families after 1960 a legacy of slavery, or might it be a legacy of the welfare state ushered in by the War on Poverty?" Confirmed by a second fetch on 23 September 2026.
- Census table CH-3, "Living Arrangements of Black Children Under 18 Years Old: 1960 to Present," 1960 Census row, in thousands: 8,650 children, 5,795 with two parents, 1,897 with one parent (1,723 mother only, 173 father only), 958 with neither parent. One parent is 21.9 percent. That matches his 22 percent. The 1960 data are for nonwhite children, from the 1960 Census, per the table's footnote.
- The same table's 2010 row for Black alone: 11,272 children, 4,424 with two parents, 6,006 with one parent (5,601 mother only, 405 father only), 843 with neither. One parent is 53.3 percent. Adding children with neither parent gives 60.8 percent. No row reaches 70 percent. The workbook was downloaded and the rows re-read.
- NCHS, "Births: Final Data for 2010," Table 15: 72.5 percent of births to non-Hispanic black mothers in 2010 were to unmarried women. The text says "73 percent for non-Hispanic black births." That is a birth statistic, not a living-arrangement statistic.

His 1960 figure matches the Census series. His "more than 70 percent" does not match that series. It matches the NCHS share of births to unmarried mothers. The two halves of his sentence use different measures.

### Sources

- Walter E. Williams, "The Welfare State's Legacy," 20 September 2017. [Creators Syndicate](https://www.creators.com/read/walter-williams/09/17/the-welfare-states-legacy). HTTP 200. Text read twice. The walterewilliams.com copy did not answer on https. [Wayback capture of that copy](http://web.archive.org/web/20180716020512/http://walterewilliams.com:80/the-welfare-states-legacy/).
- U.S. Census Bureau, "CH-3. Living Arrangements of Black Children Under 18 Years Old: 1960 to 2023." [ch3.xls](https://www2.census.gov/programs-surveys/demo/tables/families/time-series/children/ch3.xls). HTTP 200. Workbook read with xlrd. Index page: [Historical Living Arrangements of Children](https://www.census.gov/data/tables/time-series/demo/families/children.html). HTTP 200.
- Joyce A. Martin and coauthors, "Births: Final Data for 2010," National Vital Statistics Reports 61(1), 28 August 2012. [CDC PDF](https://www.cdc.gov/nchs/data/nvsr/nvsr61/nvsr61_01.pdf). HTTP 403 to curl. Read from the [Wayback capture](http://web.archive.org/web/20260904184834/https://www.cdc.gov/nchs/data/nvsr/nvsr61/nvsr61_01.pdf). Table 15 read.

### Proposed explain

```
The September 20, 2017 column says that in 1960, 22 percent of black children were raised in single-parent families, and that fifty years later the share was more than 70 percent. He poses the slavery-or-welfare-state question in those words. Outside research. The column is [The Welfare State's Legacy](https://www.creators.com/read/walter-williams/09/17/the-welfare-states-legacy). Census table CH-3, [ch3.xls](https://www2.census.gov/programs-surveys/demo/tables/families/time-series/children/ch3.xls), puts 1,897 of 8,650 thousand nonwhite children with one parent in 1960, which is 21.9 percent and matches his 22. The same table's 2010 row puts 53.3 percent of black children with one parent and 60.8 percent not living with two parents. Nothing in it reaches 70 percent. The figure that does is births. NCHS, [Births: Final Data for 2010](https://www.cdc.gov/nchs/data/nvsr/nvsr61/nvsr61_01.pdf), Table 15, reports 72.5 percent of births to non-Hispanic black mothers as births to unmarried women. His 1960 number is a living-arrangement share and his 2010 number matches a birth share.
```

Confidence. High on both Census rows and the NCHS table. High that the column says what the quiz says. The mismatch is between his second figure and the series that supplies his first.

## q30

Current explain. "He uses those census years to ask whether anyone would claim racial discrimination was lighter then. His explanation for the later pattern is labor rules that cut off the bottom rungs."

### Verified claims

- The column prints: "In every census from 1890 to 1954, blacks were either just as active as or more so than whites in the labor market. During that earlier period, black teen unemployment was roughly equal to or less than white teen unemployment." Then: "Would anyone suggest that during earlier periods, there was less racial discrimination?" and the explanation is "labor laws and regulations promoted by liberals and their union allies that cut off the bottom rungs of the economic ladder."
- Historical Statistics of the United States, Colonial Times to 1970, Series D 42-48, gives civilian labor force participation by race from 1954 only. 1954: white 58.2 percent, "Negro and other races" 64.3 percent. Every year from 1954 to 1970 has the Negro-and-other rate above the white rate. The page has no text layer and was read from a rendered image.
- BLS Handbook of Labor Statistics 1975, Table 63, unemployment rates by color, sex, and age, read from the FRASER scan. 1948, males 16 to 17: white 10.2, Negro and other 9.4. Males 18 to 19: white 9.4, Negro and other 10.5. 1954, males 16 to 17: white 14.0, Negro and other 13.4. Males 18 to 19: white 13.0, Negro and other 14.7. Females 16 to 17 in 1948: white 9.7, Negro and other 11.8. Females 18 to 19 in 1948: white 6.8, Negro and other 14.6. Both female gaps are wider in 1954.
- Overall unemployment in 1948: white 3.5, Negro and other 5.9. In 1954: white 5.0, Negro and other 9.9.
- No table read here breaks out labor-force participation by race for the censuses of 1890 to 1940. The Historical Statistics series for those years give gainful workers by sex, age, and state without race. The decennial census volumes on the Negro population were not fetched. UNVERIFIED for 1890 to 1940.

The participation half of his sentence holds for 1954 onward. The teen-unemployment half holds for males aged 16 to 17 in 1948 and 1954 and fails for males aged 18 to 19 and for teenage females in both years. 1954 is a CPS year, not a census year. "Negro and other races" is the category in those tables.

### Sources

- Walter E. Williams, "The Welfare State's Legacy," as in q29.
- U.S. Bureau of the Census, Historical Statistics of the United States, Colonial Times to 1970, Part 1, Chapter D, 1975. [Census PDF](https://www2.census.gov/library/publications/1975/compendia/hist_stats_colonial-1970/hist_stats_colonial-1970p1-chD.pdf). HTTP 200. Series D 42-48 on page 133 and Series D 87-101 on page 135 read from rendered images.
- U.S. Bureau of Labor Statistics, Handbook of Labor Statistics 1975, Reference Edition, Bulletin 1865. [FRASER scan](https://fraser.stlouisfed.org/files/docs/publications/bls/bls_1865_1975.pdf). HTTP 200. Table 4 on pages 36 and 37 and Table 63 on pages 153 to 155 read from rendered images. bls.gov returned 403 to curl.

### Proposed explain

```
He uses those census years to ask whether anyone would claim racial discrimination was lighter then. His explanation for the later pattern is labor rules that cut off the bottom rungs. Outside research. The column is [The Welfare State's Legacy](https://www.creators.com/read/walter-williams/09/17/the-welfare-states-legacy). Historical Statistics of the United States, Series D 42-48 in [Chapter D](https://www2.census.gov/library/publications/1975/compendia/hist_stats_colonial-1970/hist_stats_colonial-1970p1-chD.pdf), reports labor-force participation by race from 1954 only, at 64.3 percent for "Negro and other races" against 58.2 percent for whites, and the gap stays in that direction through 1970. The BLS [Handbook of Labor Statistics 1975](https://fraser.stlouisfed.org/files/docs/publications/bls/bls_1865_1975.pdf), Table 63, shows 1948 unemployment of 9.4 percent for nonwhite males aged 16 to 17 against 10.2 percent for white males the same age, and 1954 at 13.4 against 14.0. For males 18 to 19 and for teenage females the nonwhite rate was already higher in both years. No race breakdown for the censuses of 1890 to 1940 was read in this pass, so that part of his sentence rests on his text.
```

Confidence. High on the 1954 participation rates and the 1948 and 1954 teen rates as read from the scans. Low on 1890 to 1940, which no table here covers. The quiz's correct choice repeats his sentence, and it should stay his sentence.

## q33

Current explain. "The column's bottom line is that neither slavery nor Jim Crow nor the harshest racism has decimated the black family the way the welfare state has. The 11 percent and 75 percent figures are the comparison he uses for births to unwed mothers."

### Verified claims

- The column prints: "According to the 1938 Encyclopaedia of the Social Sciences, that year 11 percent of black children were born to unwed mothers. Today about 75 percent of black children are born to unwed mothers." And: "the black family was stronger the first 100 years after slavery than during what will be the second 100 years." And: "neither slavery nor Jim Crow nor the harshest racism has decimated the black family the way the welfare state has."
- NCHS, "Births: Final Data for 2016," Table 9: 69.8 percent of births to non-Hispanic black mothers were to unmarried women. NCHS, "Births: Final Data for 2010," Table 15: 72.5 percent. His "about 75 percent" is above both.
- The 1938 encyclopedia figure was not found in print. The Encyclopaedia of the Social Sciences (Seligman and Johnson, editors) appeared in 1930 to 1935 with later reissues. Its "Illegitimacy" article was not fetched. UNVERIFIED beyond his attribution.
- Vital Statistics of the United States, 1938, Part I, Table Q, gives 169.1 illegitimate live births per 1,000 live births for "all other races" in 1938, about 16.9 percent, in a registration area that excluded California, Massachusetts, New York, and Texas. The Bureau's note says reporting of illegitimacy "is probably incomplete and inaccurate." The 1920 to 1925 rows are near 120 per 1,000, about 12 percent. None of those rows is 11 percent, and "all other races" is not "black." The table was read from a rendered image because the scan's text layer is garbled.

### Sources

- Walter E. Williams, "The Welfare State's Legacy," as in q29.
- Joyce A. Martin and coauthors, "Births: Final Data for 2016," National Vital Statistics Reports 67(1), 31 January 2018. [CDC PDF](https://www.cdc.gov/nchs/data/nvsr/nvsr67/nvsr67_01.pdf). HTTP 403 to curl. Read from the [Wayback capture](http://web.archive.org/web/20260826135239/https://www.cdc.gov/nchs/data/nvsr/nvsr67/nvsr67_01.pdf). Table 9 read.
- "Births: Final Data for 2010," as in q29.
- U.S. Bureau of the Census, Vital Statistics of the United States, 1938, Part I, 1940. [CDC PDF](https://www.cdc.gov/nchs/data/vsus/VSUS_1938_1.pdf). HTTP 403 to curl. Read from the [Wayback capture](http://web.archive.org/web/20260905203402/https://www.cdc.gov/nchs/data/vsus/VSUS_1938_1.pdf). Table Q on page 8 read from a rendered image. Index: [Vital Statistics of the United States 1890-1938](https://www.cdc.gov/nchs/products/vsus/vsus_1890_1938.htm).

### Proposed explain

```
The column's bottom line is that neither slavery nor Jim Crow nor the harshest racism has decimated the black family the way the welfare state has. The 11 percent and 75 percent figures are the comparison he uses for births to unwed mothers. Outside research. The column is [The Welfare State's Legacy](https://www.creators.com/read/walter-williams/09/17/the-welfare-states-legacy). NCHS puts births to unmarried non-Hispanic black mothers at 72.5 percent in 2010, [Births: Final Data for 2010](https://www.cdc.gov/nchs/data/nvsr/nvsr61/nvsr61_01.pdf), Table 15, and 69.8 percent in 2016, [Births: Final Data for 2016](https://www.cdc.gov/nchs/data/nvsr/nvsr67/nvsr67_01.pdf), Table 9. His "about 75 percent" sits above both. The 1938 encyclopedia figure of 11 percent was not found in print. The Census Bureau's [Vital Statistics of the United States, 1938](https://www.cdc.gov/nchs/data/vsus/VSUS_1938_1.pdf), Table Q, reports 169.1 illegitimate births per 1,000 for "all other races," about 17 percent, in a registration area that left out four large states and, by the Bureau's own note, under-reported illegitimacy.
```

Confidence. High on the NCHS figures and the 1938 Table Q reading. Low on the 11 percent, which stays in the explain as his attribution only. Do not replace it with the 1938 vital-statistics number. They measure different populations and the Bureau flagged its own count.

## Questions to leave short

These items are biography, bibliography, definitions, or the mechanism of an argument. No outside study was needed, and none should be invented. Keep the current `explain` and `source` strings.

- `q1`, `q15`, `q16`, `q17`, `q19`, `q20`, `q24`. Childhood, birth, household, Army service, marriage, high school, Los Angeles City College. The sources are the autobiography and the Hoover profile. The birth date in `q15` is also in the New York Times and Washington Post obituaries listed under `q18`, if a later edit wants a link.
- `q2`, `q3`. Degrees and the George Mason post. Bibliographic.
- `q4`, `q12`, `q34`, `q35`, `q36`, `q37`. Book theses, titles, publishers, and years. Bibliographic. The publications page at `http://walterewilliams.com/publications/publications/` answered HTTP 200 on http during this pass and lists the titles.
- `q5`, `q11`. The minimum-wage mechanism. Qualitative. No number is asserted.
- `q21`. What the Hoover profile says about Du Bois. Attribution only. The profile is [hoover.org/news/walter-williams](https://www.hoover.org/news/walter-williams), HTTP 200.
- `q23`, `q28`. "Is politics the way?", 3 November 2004. Attribution only. Live at `http://walterewilliams.com/is-politics-the-way/`, HTTP 200 on http. No Wayback capture was found for that page.
- `q26`, `q27`, `q31`, `q32`. "Discrimination and Liberty," FEE, 1 April 1998. Definitions and an analogy. Live at [fee.org](https://fee.org/articles/discrimination-and-liberty/), HTTP 200.

## Live URLs for Williams's own texts

Checked 23 September 2026. `walterewilliams.com` answers on `http://` and returned no answer on `https://` in every probe. Prefer the creators.com or fee.org copy where one exists.

- "Race and Economics," 31 August 2011. `http://walterewilliams.com/race-and-economics/`. Backup: Wayback capture of 20 January 2026. No creators.com slug was found.
- "Minimum Wage and Discrimination," 8 February 2017. [creators.com](https://www.creators.com/read/walter-williams/02/17/minimum-wage-and-discrimination).
- "Discrimination and Segregation," 5 October 2016. [creators.com](https://www.creators.com/read/walter-williams/10/16/discrimination-and-segregation).
- "Discrimination and Liberty," 1 April 1998. [fee.org](https://fee.org/articles/discrimination-and-liberty/).
- "Is politics the way?", 3 November 2004. `http://walterewilliams.com/is-politics-the-way/`.
- "The Welfare State's Legacy," 20 September 2017. [creators.com](https://www.creators.com/read/walter-williams/09/17/the-welfare-states-legacy).
- "Compassion Versus Reality," 5 June 2007. [creators.com](https://www.creators.com/read/walter-williams/06/07/compassion-versus-reality).
- "Economics for the Citizen," May 2005. [fee.org](https://fee.org/articles/economics-for-the-citizen/). Part V: [fee.org](https://fee.org/articles/economics-for-the-citizen-part-v/).
- Biographical sketch. `http://walterewilliams.com/about/`. Backup: Wayback capture of 3 September 2026.

## UI note for Composer

`App.tsx` renders `<p className="text-muted-foreground">{question.explain}</p>` at the feedback block and `Source: {question.source}` under it. Pasting the proposed strings into `explain` will show the brackets as characters until that line renders links.

Smallest change. Copy `apps/sowell-check/src/lib/explain-links.ts` and `apps/sowell-check/src/lib/explain-links.test.ts` into `apps/williams-check/src/lib/`. Replace `{question.explain}` with `{renderExplainWithLinks(question.explain)}` and import it. That is the same three-file change PR #34 made in Sowell Check. Do not add a `sources` array. Do not add a markdown library. The `source` field can stay plain text.

One URL in this file has percent-encoded parentheses, the Joint Economic Committee PDF under `q25`. The Sowell parser stops a link at the first `)`, so the raw form with `(842)` would break. Keep the encoded form. `jec.senate.gov` serves it, HTTP 200.

Each proposed explain above was run through `parseExplainWithLinks` from the Sowell file. Every one parses into text and link segments with no bracket text left over, and every href is http or https.

## Where the reading was not primary

- `q6`. The Congressional Record page was not opened. The citation is Bernstein's.
- `q7`, `q10`, `q14`. The books were not opened. archive.org holds borrow-only copies of South Africa's War Against Capitalism and The State Against Blacks. The quoted sentences come from contemporary reviews that print Williams's words.
- `q13`. The reserved-occupation lists come from a 2014 dissertation citing Doxey and Simons and Simons, and from a 2014 journal article's reference list. No scanned statute was opened.
- `q14`. Dorsey's two papers are paywalled. The pass rates come from the Reason review and Williams's 1980 essay.
- `q30`. The Historical Statistics and BLS pages were read from rendered images of scans with no usable text layer.
- `q33`. The Encyclopaedia of the Social Sciences was not opened.
