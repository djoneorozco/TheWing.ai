/* Proposed contents for PT-Calculator/pfa-score-data.js
 * Source of truth: public/doc/PFRA Scoring Charts.pdf (Effective 1 Mar 26)
 * Standard population only. Pages 9-10 excluded (see metadata.excludedTables).
 * READ-ONLY extraction — not written to the repository.
 *
 * For scored strength/core/cardio events (not WHtR):
 *   row.male[i] / row.female[i] align to ageGroups[i] (0=under-25 … 8=60-and-over)
 * Time cells: {display, seconds, qualifier?}
 * Rep/HAMR cells: number; max rows set row.qualifier
 * minimumPassing === true marks PDF asterisk minimums (asterisk not in values)
 */

window.PCSU_PFA_SCORE_DATA = Object.freeze({
  metadata: {
    "title": "USAF Physical Fitness Readiness Assessment Scoring",
    "effectiveDate": "2026-03-01",
    "source": "public/doc/PFRA Scoring Charts.pdf",
    "version": "1.0.0",
    "standardPopulation": true,
    "excludedTables": [
      "Body Fat Assessment table on page 9",
      "AFSPECWAR/EOD standards on page 10"
    ],
    "notes": [
      "WHtR risk classifications were verified from the PDF color legend and cell fill colors on page 1.",
      "Low Risk = green (≤ 0.49 only). Moderate Risk = yellow (0.50 through 0.54). High Risk = pink/red (0.55 through ≥ 0.60).",
      "Asterisks in the PDF mark minimum passing standards; they are stored as minimumPassing flags, not inside numeric values.",
      "Plank sub-minute times appear in the PDF as :55 and :50; display values preserve that form and seconds are also provided.",
      "2-kilometer walk is pass/fail with no awarded points in the PDF.",
      "For scored events other than WHtR, each row.male and row.female array is aligned to ageGroups / ageGroupOrder (index 0 = under-25, …, index 8 = 60-and-over)."
    ]
  },
  ageGroups: ["under-25","25-29","30-34","35-39","40-44","45-49","50-54","55-59","60-and-over"],
  sexes: ["male","female"],
  components: {
    bodyComposition: {
      whtr: {
        "id": "whtr",
        "label": "Waist-to-Height Ratio (WHtR)",
        "category": "bodyComposition",
        "unit": "ratio",
        "scoringDirection": "range",
        "page": 1,
        "maximumPoints": 20,
        "minimumPoints": 0,
        "identicalAcrossDemographics": true,
        "riskLegend": {
          "Low Risk": "green",
          "Moderate Risk": "yellow",
          "High Risk": "pink"
        },
        "rows": [
          {
            "awardedPoints": 20,
            "ratio": 0.49,
            "ratioDisplay": "≤ 0.49",
            "qualifier": "at-or-below",
            "riskClassification": "Low Risk",
            "maximumScoring": true,
            "minimumPassing": false,
            "appliesToAllAgeGroupsAndSexes": true
          },
          {
            "awardedPoints": 19,
            "ratio": 0.5,
            "ratioDisplay": "0.50",
            "qualifier": "exact",
            "riskClassification": "Moderate Risk",
            "maximumScoring": false,
            "minimumPassing": false,
            "appliesToAllAgeGroupsAndSexes": true
          },
          {
            "awardedPoints": 18,
            "ratio": 0.51,
            "ratioDisplay": "0.51",
            "qualifier": "exact",
            "riskClassification": "Moderate Risk",
            "maximumScoring": false,
            "minimumPassing": false,
            "appliesToAllAgeGroupsAndSexes": true
          },
          {
            "awardedPoints": 17,
            "ratio": 0.52,
            "ratioDisplay": "0.52",
            "qualifier": "exact",
            "riskClassification": "Moderate Risk",
            "maximumScoring": false,
            "minimumPassing": false,
            "appliesToAllAgeGroupsAndSexes": true
          },
          {
            "awardedPoints": 16,
            "ratio": 0.53,
            "ratioDisplay": "0.53",
            "qualifier": "exact",
            "riskClassification": "Moderate Risk",
            "maximumScoring": false,
            "minimumPassing": false,
            "appliesToAllAgeGroupsAndSexes": true
          },
          {
            "awardedPoints": 15,
            "ratio": 0.54,
            "ratioDisplay": "0.54",
            "qualifier": "exact",
            "riskClassification": "Moderate Risk",
            "maximumScoring": false,
            "minimumPassing": false,
            "appliesToAllAgeGroupsAndSexes": true
          },
          {
            "awardedPoints": 12.5,
            "ratio": 0.55,
            "ratioDisplay": "0.55",
            "qualifier": "exact",
            "riskClassification": "High Risk",
            "maximumScoring": false,
            "minimumPassing": false,
            "appliesToAllAgeGroupsAndSexes": true
          },
          {
            "awardedPoints": 10,
            "ratio": 0.56,
            "ratioDisplay": "0.56",
            "qualifier": "exact",
            "riskClassification": "High Risk",
            "maximumScoring": false,
            "minimumPassing": false,
            "appliesToAllAgeGroupsAndSexes": true
          },
          {
            "awardedPoints": 7.5,
            "ratio": 0.57,
            "ratioDisplay": "0.57",
            "qualifier": "exact",
            "riskClassification": "High Risk",
            "maximumScoring": false,
            "minimumPassing": false,
            "appliesToAllAgeGroupsAndSexes": true
          },
          {
            "awardedPoints": 5,
            "ratio": 0.58,
            "ratioDisplay": "0.58",
            "qualifier": "exact",
            "riskClassification": "High Risk",
            "maximumScoring": false,
            "minimumPassing": false,
            "appliesToAllAgeGroupsAndSexes": true
          },
          {
            "awardedPoints": 2.5,
            "ratio": 0.59,
            "ratioDisplay": "0.59",
            "qualifier": "exact",
            "riskClassification": "High Risk",
            "maximumScoring": false,
            "minimumPassing": false,
            "appliesToAllAgeGroupsAndSexes": true
          },
          {
            "awardedPoints": 0,
            "ratio": 0.6,
            "ratioDisplay": "≥ 0.60",
            "qualifier": "at-or-above",
            "riskClassification": "High Risk",
            "maximumScoring": false,
            "minimumPassing": false,
            "appliesToAllAgeGroupsAndSexes": true
          }
        ]
      },
    },
    strength: {
      pushups: {
        id: "pushups",
        label: "1-Minute Push-Ups",
        category: "strength",
        unit: "reps",
        scoringDirection: "higher-is-better",
        page: 2,
        maximumPoints: 15,
        minimumPoints: 2.5,
        ageGroupOrder: ["under-25","25-29","30-34","35-39","40-44","45-49","50-54","55-59","60-and-over"],
        rows: [
          {"awardedPoints":15,"maximumScoring":true,"minimumPassing":false,"male":[67,63,60,56,52,49,45,42,38],"female":[50,47,44,42,39,36,34,31,28],"qualifier":"at-or-above"},
          {"awardedPoints":14.5,"maximumScoring":false,"minimumPassing":false,"male":[66,62,59,55,51,47,44,41,37],"female":[49,46,42,41,38,35,33,30,27]},
          {"awardedPoints":14,"maximumScoring":false,"minimumPassing":false,"male":[64,60,57,53,50,46,43,40,36],"female":[47,44,41,40,37,34,32,29,26]},
          {"awardedPoints":13.5,"maximumScoring":false,"minimumPassing":false,"male":[63,59,56,52,49,45,42,39,35],"female":[46,43,40,38,36,33,31,28,25]},
          {"awardedPoints":13,"maximumScoring":false,"minimumPassing":false,"male":[61,57,55,51,48,44,41,38,34],"female":[44,42,39,37,35,32,30,27,24]},
          {"awardedPoints":12.5,"maximumScoring":false,"minimumPassing":false,"male":[60,56,53,49,46,43,39,36,33],"female":[43,40,37,36,33,30,29,26,23]},
          {"awardedPoints":12,"maximumScoring":false,"minimumPassing":false,"male":[58,55,52,48,45,42,38,35,32],"female":[42,39,36,35,32,29,28,25,22]},
          {"awardedPoints":11.5,"maximumScoring":false,"minimumPassing":false,"male":[57,53,51,47,44,40,37,34,31],"female":[40,38,35,33,31,28,26,24,21]},
          {"awardedPoints":11,"maximumScoring":false,"minimumPassing":false,"male":[55,52,49,45,42,39,36,33,30],"female":[39,36,34,32,30,27,25,23,20]},
          {"awardedPoints":10.5,"maximumScoring":false,"minimumPassing":false,"male":[54,50,48,44,41,38,35,32,29],"female":[37,35,32,31,29,26,24,22,19]},
          {"awardedPoints":10,"maximumScoring":false,"minimumPassing":false,"male":[52,49,47,43,40,37,34,31,28],"female":[36,34,31,30,27,25,23,21,18]},
          {"awardedPoints":9.5,"maximumScoring":false,"minimumPassing":false,"male":[51,48,45,41,39,36,33,30,27],"female":[35,32,30,28,26,24,22,20,17]},
          {"awardedPoints":9,"maximumScoring":false,"minimumPassing":false,"male":[49,46,44,40,37,35,32,29,26],"female":[33,31,29,27,25,23,21,19,16]},
          {"awardedPoints":8.5,"maximumScoring":false,"minimumPassing":false,"male":[48,45,43,39,36,33,30,27,24],"female":[32,30,27,26,24,21,20,17,15]},
          {"awardedPoints":8,"maximumScoring":false,"minimumPassing":false,"male":[46,43,41,38,35,32,29,26,23],"female":[30,29,26,25,23,20,19,16,14]},
          {"awardedPoints":7.5,"maximumScoring":false,"minimumPassing":false,"male":[45,42,40,36,33,31,28,25,22],"female":[29,27,25,23,21,19,18,15,13]},
          {"awardedPoints":7,"maximumScoring":false,"minimumPassing":false,"male":[43,41,39,35,32,30,27,24,21],"female":[28,26,24,22,20,18,17,14,12]},
          {"awardedPoints":6.5,"maximumScoring":false,"minimumPassing":false,"male":[42,39,37,34,31,29,26,23,20],"female":[26,25,22,21,19,17,16,13,11]},
          {"awardedPoints":6,"maximumScoring":false,"minimumPassing":false,"male":[40,38,36,32,30,28,25,22,19],"female":[25,23,21,20,18,16,15,12,10]},
          {"awardedPoints":5.5,"maximumScoring":false,"minimumPassing":false,"male":[39,36,35,31,28,26,24,21,18],"female":[23,22,20,18,17,15,13,11,9]},
          {"awardedPoints":5,"maximumScoring":false,"minimumPassing":false,"male":[37,35,33,30,27,25,23,20,17],"female":[22,21,19,17,15,14,12,10,8]},
          {"awardedPoints":4.5,"maximumScoring":false,"minimumPassing":false,"male":[36,34,32,28,26,24,21,18,16],"female":[21,19,17,16,14,12,11,9,7]},
          {"awardedPoints":4,"maximumScoring":false,"minimumPassing":false,"male":[34,32,31,27,24,23,20,17,15],"female":[19,18,16,15,13,11,10,8,6]},
          {"awardedPoints":3.5,"maximumScoring":false,"minimumPassing":false,"male":[33,31,29,26,23,22,19,16,14],"female":[18,17,15,13,12,10,9,7,5]},
          {"awardedPoints":3,"maximumScoring":false,"minimumPassing":false,"male":[31,29,26,24,22,21,18,15,13],"female":[16,15,14,12,11,9,8,6,4]},
          {"awardedPoints":2.5,"maximumScoring":false,"minimumPassing":true,"male":[30,28,26,23,21,19,17,14,12],"female":[15,14,12,11,10,8,7,5,3]}
        ]
      },
      handReleasePushups: {
        id: "handReleasePushups",
        label: "2-Minute Hand-Release Push-Ups",
        category: "strength",
        unit: "reps",
        scoringDirection: "higher-is-better",
        page: 3,
        maximumPoints: 15,
        minimumPoints: 2.5,
        ageGroupOrder: ["under-25","25-29","30-34","35-39","40-44","45-49","50-54","55-59","60-and-over"],
        rows: [
          {"awardedPoints":15,"maximumScoring":true,"minimumPassing":false,"male":[52,50,48,46,44,42,40,38,36],"female":[42,40,38,36,34,32,30,28,26],"qualifier":"at-or-above"},
          {"awardedPoints":14.5,"maximumScoring":false,"minimumPassing":false,"male":[51,49,47,45,43,41,39,37,35],"female":[41,39,37,35,33,31,29,27,25]},
          {"awardedPoints":14,"maximumScoring":false,"minimumPassing":false,"male":[50,48,46,44,42,40,38,36,34],"female":[40,38,36,34,32,30,28,26,24]},
          {"awardedPoints":13.5,"maximumScoring":false,"minimumPassing":false,"male":[49,47,45,43,41,39,37,35,33],"female":[39,37,35,33,31,29,27,25,23]},
          {"awardedPoints":13,"maximumScoring":false,"minimumPassing":false,"male":[48,46,44,42,40,38,36,34,32],"female":[38,36,34,32,30,28,26,24,22]},
          {"awardedPoints":12.5,"maximumScoring":false,"minimumPassing":false,"male":[47,45,43,41,39,37,35,33,31],"female":[37,35,33,31,29,27,25,23,21]},
          {"awardedPoints":12,"maximumScoring":false,"minimumPassing":false,"male":[46,44,42,40,38,36,34,32,30],"female":[36,34,32,30,28,26,24,22,20]},
          {"awardedPoints":11.5,"maximumScoring":false,"minimumPassing":false,"male":[45,43,41,39,37,35,33,31,29],"female":[35,33,31,29,27,25,23,21,19]},
          {"awardedPoints":11,"maximumScoring":false,"minimumPassing":false,"male":[44,42,40,38,36,34,32,30,28],"female":[34,32,30,28,26,24,22,20,18]},
          {"awardedPoints":10.5,"maximumScoring":false,"minimumPassing":false,"male":[43,41,39,37,35,33,31,29,27],"female":[33,31,29,27,25,23,21,19,17]},
          {"awardedPoints":10,"maximumScoring":false,"minimumPassing":false,"male":[42,40,38,36,34,32,30,28,26],"female":[32,30,28,26,24,22,20,18,16]},
          {"awardedPoints":9.5,"maximumScoring":false,"minimumPassing":false,"male":[41,39,37,35,33,31,29,27,25],"female":[31,29,27,25,23,21,19,17,15]},
          {"awardedPoints":9,"maximumScoring":false,"minimumPassing":false,"male":[40,38,36,34,32,30,28,26,24],"female":[30,28,26,24,22,20,18,16,14]},
          {"awardedPoints":8.5,"maximumScoring":false,"minimumPassing":false,"male":[39,37,35,33,31,29,27,25,23],"female":[29,27,25,23,21,19,17,15,13]},
          {"awardedPoints":8,"maximumScoring":false,"minimumPassing":false,"male":[38,36,34,32,30,28,26,24,22],"female":[28,26,24,22,20,18,16,14,12]},
          {"awardedPoints":7.5,"maximumScoring":false,"minimumPassing":false,"male":[37,35,33,31,29,27,25,23,21],"female":[27,25,23,21,19,17,15,13,11]},
          {"awardedPoints":7,"maximumScoring":false,"minimumPassing":false,"male":[36,34,32,30,28,26,24,22,20],"female":[26,24,22,20,18,16,14,12,10]},
          {"awardedPoints":6.5,"maximumScoring":false,"minimumPassing":false,"male":[35,33,31,29,27,25,23,21,19],"female":[25,23,21,19,17,15,13,11,9]},
          {"awardedPoints":6,"maximumScoring":false,"minimumPassing":false,"male":[34,32,30,28,26,24,22,20,18],"female":[24,22,20,18,16,14,12,10,8]},
          {"awardedPoints":5.5,"maximumScoring":false,"minimumPassing":false,"male":[33,31,29,27,25,23,21,19,17],"female":[23,21,19,17,15,13,11,9,7]},
          {"awardedPoints":5,"maximumScoring":false,"minimumPassing":false,"male":[32,30,28,26,24,22,20,18,16],"female":[22,20,18,16,14,12,10,8,6]},
          {"awardedPoints":4.5,"maximumScoring":false,"minimumPassing":false,"male":[31,29,27,25,23,21,19,17,15],"female":[21,19,17,15,13,11,9,7,5]},
          {"awardedPoints":4,"maximumScoring":false,"minimumPassing":false,"male":[30,28,26,24,22,20,18,16,14],"female":[20,18,16,14,12,10,8,6,4]},
          {"awardedPoints":3.5,"maximumScoring":false,"minimumPassing":false,"male":[29,27,25,23,21,19,17,15,13],"female":[19,17,15,13,11,9,7,5,3]},
          {"awardedPoints":3,"maximumScoring":false,"minimumPassing":false,"male":[28,26,24,22,20,18,16,14,12],"female":[18,16,14,12,10,8,6,4,2]},
          {"awardedPoints":2.5,"maximumScoring":false,"minimumPassing":true,"male":[27,25,23,21,19,17,15,13,11],"female":[17,15,13,11,9,7,5,3,1]}
        ]
      }
    },
    core: {
      situps: {
        id: "situps",
        label: "1-Minute Sit-Ups",
        category: "core",
        unit: "reps",
        scoringDirection: "higher-is-better",
        page: 4,
        maximumPoints: 15,
        minimumPoints: 2.5,
        ageGroupOrder: ["under-25","25-29","30-34","35-39","40-44","45-49","50-54","55-59","60-and-over"],
        rows: [
          {"awardedPoints":15,"maximumScoring":true,"minimumPassing":false,"male":[58,56,54,52,50,48,46,44,42],"female":[54,50,45,43,41,35,34,32,31],"qualifier":"at-or-above"},
          {"awardedPoints":14.5,"maximumScoring":false,"minimumPassing":false,"male":[57,55,53,51,49,47,45,43,41],"female":[53,49,44,42,40,34,33,31,30]},
          {"awardedPoints":14,"maximumScoring":false,"minimumPassing":false,"male":[56,54,52,50,48,46,44,42,40],"female":[52,48,43,41,39,33,32,30,29]},
          {"awardedPoints":13.5,"maximumScoring":false,"minimumPassing":false,"male":[55,53,51,49,47,45,43,41,39],"female":[51,47,42,40,38,32,31,29,28]},
          {"awardedPoints":13,"maximumScoring":false,"minimumPassing":false,"male":[54,52,50,48,46,44,42,40,38],"female":[50,46,41,39,37,31,30,28,27]},
          {"awardedPoints":12.5,"maximumScoring":false,"minimumPassing":false,"male":[53,51,49,47,45,43,41,39,37],"female":[49,45,40,38,36,30,29,27,26]},
          {"awardedPoints":12,"maximumScoring":false,"minimumPassing":false,"male":[52,50,48,46,44,42,40,38,36],"female":[48,44,39,37,35,29,28,26,25]},
          {"awardedPoints":11.5,"maximumScoring":false,"minimumPassing":false,"male":[51,49,47,45,43,41,39,37,35],"female":[47,43,38,36,34,28,27,25,24]},
          {"awardedPoints":11,"maximumScoring":false,"minimumPassing":false,"male":[50,48,46,44,42,40,38,36,34],"female":[46,42,37,35,33,27,26,24,23]},
          {"awardedPoints":10.5,"maximumScoring":false,"minimumPassing":false,"male":[49,47,45,43,41,39,37,35,33],"female":[45,41,36,34,32,26,25,23,22]},
          {"awardedPoints":10,"maximumScoring":false,"minimumPassing":false,"male":[48,46,44,42,40,38,36,34,32],"female":[44,40,35,33,31,25,24,22,21]},
          {"awardedPoints":9.5,"maximumScoring":false,"minimumPassing":false,"male":[47,45,43,41,39,37,35,33,31],"female":[43,39,34,32,30,24,23,21,20]},
          {"awardedPoints":9,"maximumScoring":false,"minimumPassing":false,"male":[46,44,42,40,38,36,34,32,30],"female":[42,38,33,31,29,23,22,20,19]},
          {"awardedPoints":8.5,"maximumScoring":false,"minimumPassing":false,"male":[45,43,41,39,37,35,33,31,29],"female":[41,37,32,30,28,22,21,19,18]},
          {"awardedPoints":8,"maximumScoring":false,"minimumPassing":false,"male":[44,42,40,38,36,34,32,30,28],"female":[40,36,31,29,27,21,20,18,17]},
          {"awardedPoints":7.5,"maximumScoring":false,"minimumPassing":false,"male":[43,41,39,37,35,33,31,29,27],"female":[39,35,30,28,26,20,19,17,16]},
          {"awardedPoints":7,"maximumScoring":false,"minimumPassing":false,"male":[42,40,38,36,34,32,30,28,26],"female":[38,34,29,27,25,19,18,16,15]},
          {"awardedPoints":6.5,"maximumScoring":false,"minimumPassing":false,"male":[41,39,37,35,33,31,29,27,25],"female":[37,33,28,26,24,18,17,15,14]},
          {"awardedPoints":6,"maximumScoring":false,"minimumPassing":false,"male":[40,38,36,34,32,30,28,26,24],"female":[36,32,27,25,23,17,16,14,13]},
          {"awardedPoints":5.5,"maximumScoring":false,"minimumPassing":false,"male":[39,37,35,33,31,29,27,25,23],"female":[35,31,26,24,22,16,15,13,12]},
          {"awardedPoints":5,"maximumScoring":false,"minimumPassing":false,"male":[38,36,34,32,30,28,26,24,22],"female":[34,30,25,23,21,15,14,12,11]},
          {"awardedPoints":4.5,"maximumScoring":false,"minimumPassing":false,"male":[37,35,33,31,29,27,25,23,21],"female":[33,29,24,22,20,14,13,11,10]},
          {"awardedPoints":4,"maximumScoring":false,"minimumPassing":false,"male":[36,34,32,30,28,26,24,22,20],"female":[32,28,23,21,19,13,12,10,9]},
          {"awardedPoints":3.5,"maximumScoring":false,"minimumPassing":false,"male":[35,33,31,29,27,25,23,21,19],"female":[31,27,22,20,18,12,11,9,8]},
          {"awardedPoints":3,"maximumScoring":false,"minimumPassing":false,"male":[34,32,30,28,26,24,22,20,18],"female":[30,26,21,19,17,11,10,8,7]},
          {"awardedPoints":2.5,"maximumScoring":false,"minimumPassing":true,"male":[33,31,29,27,25,23,21,19,17],"female":[29,25,20,18,16,10,9,7,6]}
        ]
      },
      crossLegReverseCrunch: {
        id: "crossLegReverseCrunch",
        label: "2-Minute Cross-Leg Reverse Crunch",
        category: "core",
        unit: "reps",
        scoringDirection: "higher-is-better",
        page: 5,
        maximumPoints: 15,
        minimumPoints: 2.5,
        ageGroupOrder: ["under-25","25-29","30-34","35-39","40-44","45-49","50-54","55-59","60-and-over"],
        rows: [
          {"awardedPoints":15,"maximumScoring":true,"minimumPassing":false,"male":[60,58,56,54,52,50,48,46,44],"female":[58,56,54,52,50,48,46,44,42],"qualifier":"at-or-above"},
          {"awardedPoints":14.5,"maximumScoring":false,"minimumPassing":false,"male":[59,57,55,53,51,49,47,45,43],"female":[57,55,53,51,49,47,45,43,41]},
          {"awardedPoints":14,"maximumScoring":false,"minimumPassing":false,"male":[58,56,54,52,50,48,46,44,42],"female":[56,54,52,50,48,46,44,42,40]},
          {"awardedPoints":13.5,"maximumScoring":false,"minimumPassing":false,"male":[57,55,53,51,49,47,45,43,41],"female":[55,53,51,49,47,45,43,41,39]},
          {"awardedPoints":13,"maximumScoring":false,"minimumPassing":false,"male":[56,54,52,50,48,46,44,42,40],"female":[54,52,50,48,46,44,42,40,38]},
          {"awardedPoints":12.5,"maximumScoring":false,"minimumPassing":false,"male":[55,53,51,49,47,45,43,41,39],"female":[53,51,49,47,45,43,41,39,37]},
          {"awardedPoints":12,"maximumScoring":false,"minimumPassing":false,"male":[54,52,50,48,46,44,42,40,38],"female":[52,50,48,46,44,42,40,38,36]},
          {"awardedPoints":11.5,"maximumScoring":false,"minimumPassing":false,"male":[53,51,49,47,45,43,41,39,37],"female":[51,49,47,45,43,41,39,37,35]},
          {"awardedPoints":11,"maximumScoring":false,"minimumPassing":false,"male":[52,50,48,46,44,42,40,38,36],"female":[50,48,46,44,42,40,38,36,34]},
          {"awardedPoints":10.5,"maximumScoring":false,"minimumPassing":false,"male":[51,49,47,45,43,41,39,37,35],"female":[49,47,45,43,41,39,37,35,33]},
          {"awardedPoints":10,"maximumScoring":false,"minimumPassing":false,"male":[50,48,46,44,42,40,38,36,34],"female":[48,46,44,42,40,38,36,34,32]},
          {"awardedPoints":9.5,"maximumScoring":false,"minimumPassing":false,"male":[49,47,45,43,41,39,37,35,33],"female":[47,45,43,41,39,37,35,33,31]},
          {"awardedPoints":9,"maximumScoring":false,"minimumPassing":false,"male":[48,46,44,42,40,38,36,34,32],"female":[46,44,42,40,38,36,34,32,30]},
          {"awardedPoints":8.5,"maximumScoring":false,"minimumPassing":false,"male":[47,45,43,41,39,37,35,33,31],"female":[45,43,41,39,37,35,33,31,29]},
          {"awardedPoints":8,"maximumScoring":false,"minimumPassing":false,"male":[46,44,42,40,38,36,34,32,30],"female":[44,42,40,38,36,34,32,30,28]},
          {"awardedPoints":7.5,"maximumScoring":false,"minimumPassing":false,"male":[45,43,41,39,37,35,33,31,29],"female":[43,41,39,37,35,33,31,29,27]},
          {"awardedPoints":7,"maximumScoring":false,"minimumPassing":false,"male":[44,42,40,38,36,34,32,30,28],"female":[42,40,38,36,34,32,30,28,26]},
          {"awardedPoints":6.5,"maximumScoring":false,"minimumPassing":false,"male":[43,41,39,37,35,33,31,29,27],"female":[41,39,37,35,33,31,29,27,25]},
          {"awardedPoints":6,"maximumScoring":false,"minimumPassing":false,"male":[42,40,38,36,34,32,30,28,26],"female":[40,38,36,34,32,30,28,26,24]},
          {"awardedPoints":5.5,"maximumScoring":false,"minimumPassing":false,"male":[41,39,37,35,33,31,29,27,25],"female":[39,37,35,33,31,29,27,25,23]},
          {"awardedPoints":5,"maximumScoring":false,"minimumPassing":false,"male":[40,38,36,34,32,30,28,26,24],"female":[38,36,34,32,30,28,26,24,22]},
          {"awardedPoints":4.5,"maximumScoring":false,"minimumPassing":false,"male":[39,37,35,33,31,29,27,25,23],"female":[37,35,33,31,29,27,25,23,21]},
          {"awardedPoints":4,"maximumScoring":false,"minimumPassing":false,"male":[38,36,34,32,30,28,26,24,22],"female":[36,34,32,30,28,26,24,22,20]},
          {"awardedPoints":3.5,"maximumScoring":false,"minimumPassing":false,"male":[37,35,33,31,29,27,25,23,21],"female":[35,33,31,29,27,25,23,21,19]},
          {"awardedPoints":3,"maximumScoring":false,"minimumPassing":false,"male":[36,34,32,30,28,26,24,22,20],"female":[34,32,30,28,26,24,22,20,18]},
          {"awardedPoints":2.5,"maximumScoring":false,"minimumPassing":true,"male":[35,33,31,29,27,25,23,21,19],"female":[33,31,29,27,25,23,21,19,17]}
        ]
      },
      forearmPlank: {
        id: "forearmPlank",
        label: "Timed Forearm Plank",
        category: "core",
        unit: "min:sec",
        scoringDirection: "higher-is-better",
        page: 6,
        maximumPoints: 15,
        minimumPoints: 2.5,
        ageGroupOrder: ["under-25","25-29","30-34","35-39","40-44","45-49","50-54","55-59","60-and-over"],
        rows: [
          {"awardedPoints":15,"maximumScoring":true,"minimumPassing":false,"male":[{"display":"3:40","seconds":220,"qualifier":"at-or-above"},{"display":"3:35","seconds":215,"qualifier":"at-or-above"},{"display":"3:30","seconds":210,"qualifier":"at-or-above"},{"display":"3:25","seconds":205,"qualifier":"at-or-above"},{"display":"3:20","seconds":200,"qualifier":"at-or-above"},{"display":"3:15","seconds":195,"qualifier":"at-or-above"},{"display":"3:10","seconds":190,"qualifier":"at-or-above"},{"display":"3:05","seconds":185,"qualifier":"at-or-above"},{"display":"3:00","seconds":180,"qualifier":"at-or-above"}],"female":[{"display":"3:35","seconds":215,"qualifier":"at-or-above"},{"display":"3:30","seconds":210,"qualifier":"at-or-above"},{"display":"3:25","seconds":205,"qualifier":"at-or-above"},{"display":"3:20","seconds":200,"qualifier":"at-or-above"},{"display":"3:15","seconds":195,"qualifier":"at-or-above"},{"display":"3:10","seconds":190,"qualifier":"at-or-above"},{"display":"3:05","seconds":185,"qualifier":"at-or-above"},{"display":"3:00","seconds":180,"qualifier":"at-or-above"},{"display":"2:55","seconds":175,"qualifier":"at-or-above"}],"qualifier":"at-or-above"},
          {"awardedPoints":14.5,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"3:35","seconds":215},{"display":"3:30","seconds":210},{"display":"3:25","seconds":205},{"display":"3:20","seconds":200},{"display":"3:15","seconds":195},{"display":"3:10","seconds":190},{"display":"3:05","seconds":185},{"display":"3:00","seconds":180},{"display":"2:55","seconds":175}],"female":[{"display":"3:30","seconds":210},{"display":"3:25","seconds":205},{"display":"3:20","seconds":200},{"display":"3:15","seconds":195},{"display":"3:10","seconds":190},{"display":"3:05","seconds":185},{"display":"3:00","seconds":180},{"display":"2:55","seconds":175},{"display":"2:50","seconds":170}]},
          {"awardedPoints":14,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"3:30","seconds":210},{"display":"3:25","seconds":205},{"display":"3:20","seconds":200},{"display":"3:15","seconds":195},{"display":"3:10","seconds":190},{"display":"3:05","seconds":185},{"display":"3:00","seconds":180},{"display":"2:55","seconds":175},{"display":"2:50","seconds":170}],"female":[{"display":"3:25","seconds":205},{"display":"3:20","seconds":200},{"display":"3:15","seconds":195},{"display":"3:10","seconds":190},{"display":"3:05","seconds":185},{"display":"3:00","seconds":180},{"display":"2:55","seconds":175},{"display":"2:50","seconds":170},{"display":"2:45","seconds":165}]},
          {"awardedPoints":13.5,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"3:25","seconds":205},{"display":"3:20","seconds":200},{"display":"3:15","seconds":195},{"display":"3:10","seconds":190},{"display":"3:05","seconds":185},{"display":"3:00","seconds":180},{"display":"2:55","seconds":175},{"display":"2:50","seconds":170},{"display":"2:45","seconds":165}],"female":[{"display":"3:20","seconds":200},{"display":"3:15","seconds":195},{"display":"3:10","seconds":190},{"display":"3:05","seconds":185},{"display":"3:00","seconds":180},{"display":"2:55","seconds":175},{"display":"2:50","seconds":170},{"display":"2:45","seconds":165},{"display":"2:40","seconds":160}]},
          {"awardedPoints":13,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"3:20","seconds":200},{"display":"3:15","seconds":195},{"display":"3:10","seconds":190},{"display":"3:05","seconds":185},{"display":"3:00","seconds":180},{"display":"2:55","seconds":175},{"display":"2:50","seconds":170},{"display":"2:45","seconds":165},{"display":"2:40","seconds":160}],"female":[{"display":"3:15","seconds":195},{"display":"3:10","seconds":190},{"display":"3:05","seconds":185},{"display":"3:00","seconds":180},{"display":"2:55","seconds":175},{"display":"2:50","seconds":170},{"display":"2:45","seconds":165},{"display":"2:40","seconds":160},{"display":"2:35","seconds":155}]},
          {"awardedPoints":12.5,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"3:15","seconds":195},{"display":"3:10","seconds":190},{"display":"3:05","seconds":185},{"display":"3:00","seconds":180},{"display":"2:55","seconds":175},{"display":"2:50","seconds":170},{"display":"2:45","seconds":165},{"display":"2:40","seconds":160},{"display":"2:35","seconds":155}],"female":[{"display":"3:10","seconds":190},{"display":"3:05","seconds":185},{"display":"3:00","seconds":180},{"display":"2:55","seconds":175},{"display":"2:50","seconds":170},{"display":"2:45","seconds":165},{"display":"2:40","seconds":160},{"display":"2:35","seconds":155},{"display":"2:30","seconds":150}]},
          {"awardedPoints":12,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"3:10","seconds":190},{"display":"3:05","seconds":185},{"display":"3:00","seconds":180},{"display":"2:55","seconds":175},{"display":"2:50","seconds":170},{"display":"2:45","seconds":165},{"display":"2:40","seconds":160},{"display":"2:35","seconds":155},{"display":"2:30","seconds":150}],"female":[{"display":"3:05","seconds":185},{"display":"3:00","seconds":180},{"display":"2:55","seconds":175},{"display":"2:50","seconds":170},{"display":"2:45","seconds":165},{"display":"2:40","seconds":160},{"display":"2:35","seconds":155},{"display":"2:30","seconds":150},{"display":"2:25","seconds":145}]},
          {"awardedPoints":11.5,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"3:05","seconds":185},{"display":"3:00","seconds":180},{"display":"2:55","seconds":175},{"display":"2:50","seconds":170},{"display":"2:45","seconds":165},{"display":"2:40","seconds":160},{"display":"2:35","seconds":155},{"display":"2:30","seconds":150},{"display":"2:25","seconds":145}],"female":[{"display":"3:00","seconds":180},{"display":"2:55","seconds":175},{"display":"2:50","seconds":170},{"display":"2:45","seconds":165},{"display":"2:40","seconds":160},{"display":"2:35","seconds":155},{"display":"2:30","seconds":150},{"display":"2:25","seconds":145},{"display":"2:20","seconds":140}]},
          {"awardedPoints":11,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"3:00","seconds":180},{"display":"2:55","seconds":175},{"display":"2:50","seconds":170},{"display":"2:45","seconds":165},{"display":"2:40","seconds":160},{"display":"2:35","seconds":155},{"display":"2:30","seconds":150},{"display":"2:25","seconds":145},{"display":"2:20","seconds":140}],"female":[{"display":"2:55","seconds":175},{"display":"2:50","seconds":170},{"display":"2:45","seconds":165},{"display":"2:40","seconds":160},{"display":"2:35","seconds":155},{"display":"2:30","seconds":150},{"display":"2:25","seconds":145},{"display":"2:20","seconds":140},{"display":"2:15","seconds":135}]},
          {"awardedPoints":10.5,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"2:55","seconds":175},{"display":"2:50","seconds":170},{"display":"2:45","seconds":165},{"display":"2:40","seconds":160},{"display":"2:35","seconds":155},{"display":"2:30","seconds":150},{"display":"2:25","seconds":145},{"display":"2:20","seconds":140},{"display":"2:15","seconds":135}],"female":[{"display":"2:50","seconds":170},{"display":"2:45","seconds":165},{"display":"2:40","seconds":160},{"display":"2:35","seconds":155},{"display":"2:30","seconds":150},{"display":"2:25","seconds":145},{"display":"2:20","seconds":140},{"display":"2:15","seconds":135},{"display":"2:10","seconds":130}]},
          {"awardedPoints":10,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"2:50","seconds":170},{"display":"2:45","seconds":165},{"display":"2:40","seconds":160},{"display":"2:35","seconds":155},{"display":"2:30","seconds":150},{"display":"2:25","seconds":145},{"display":"2:20","seconds":140},{"display":"2:15","seconds":135},{"display":"2:10","seconds":130}],"female":[{"display":"2:45","seconds":165},{"display":"2:40","seconds":160},{"display":"2:35","seconds":155},{"display":"2:30","seconds":150},{"display":"2:25","seconds":145},{"display":"2:20","seconds":140},{"display":"2:15","seconds":135},{"display":"2:10","seconds":130},{"display":"2:05","seconds":125}]},
          {"awardedPoints":9.5,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"2:45","seconds":165},{"display":"2:40","seconds":160},{"display":"2:35","seconds":155},{"display":"2:30","seconds":150},{"display":"2:25","seconds":145},{"display":"2:20","seconds":140},{"display":"2:15","seconds":135},{"display":"2:10","seconds":130},{"display":"2:05","seconds":125}],"female":[{"display":"2:40","seconds":160},{"display":"2:35","seconds":155},{"display":"2:30","seconds":150},{"display":"2:25","seconds":145},{"display":"2:20","seconds":140},{"display":"2:15","seconds":135},{"display":"2:10","seconds":130},{"display":"2:05","seconds":125},{"display":"2:00","seconds":120}]},
          {"awardedPoints":9,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"2:40","seconds":160},{"display":"2:35","seconds":155},{"display":"2:30","seconds":150},{"display":"2:25","seconds":145},{"display":"2:20","seconds":140},{"display":"2:15","seconds":135},{"display":"2:10","seconds":130},{"display":"2:05","seconds":125},{"display":"2:00","seconds":120}],"female":[{"display":"2:35","seconds":155},{"display":"2:30","seconds":150},{"display":"2:25","seconds":145},{"display":"2:20","seconds":140},{"display":"2:15","seconds":135},{"display":"2:10","seconds":130},{"display":"2:05","seconds":125},{"display":"2:00","seconds":120},{"display":"1:55","seconds":115}]},
          {"awardedPoints":8.5,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"2:35","seconds":155},{"display":"2:30","seconds":150},{"display":"2:25","seconds":145},{"display":"2:20","seconds":140},{"display":"2:15","seconds":135},{"display":"2:10","seconds":130},{"display":"2:05","seconds":125},{"display":"2:00","seconds":120},{"display":"1:55","seconds":115}],"female":[{"display":"2:30","seconds":150},{"display":"2:25","seconds":145},{"display":"2:20","seconds":140},{"display":"2:15","seconds":135},{"display":"2:10","seconds":130},{"display":"2:05","seconds":125},{"display":"2:00","seconds":120},{"display":"1:55","seconds":115},{"display":"1:50","seconds":110}]},
          {"awardedPoints":8,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"2:30","seconds":150},{"display":"2:25","seconds":145},{"display":"2:20","seconds":140},{"display":"2:15","seconds":135},{"display":"2:10","seconds":130},{"display":"2:05","seconds":125},{"display":"2:00","seconds":120},{"display":"1:55","seconds":115},{"display":"1:50","seconds":110}],"female":[{"display":"2:25","seconds":145},{"display":"2:20","seconds":140},{"display":"2:15","seconds":135},{"display":"2:10","seconds":130},{"display":"2:05","seconds":125},{"display":"2:00","seconds":120},{"display":"1:55","seconds":115},{"display":"1:50","seconds":110},{"display":"1:45","seconds":105}]},
          {"awardedPoints":7.5,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"2:25","seconds":145},{"display":"2:20","seconds":140},{"display":"2:15","seconds":135},{"display":"2:10","seconds":130},{"display":"2:05","seconds":125},{"display":"2:00","seconds":120},{"display":"1:55","seconds":115},{"display":"1:50","seconds":110},{"display":"1:45","seconds":105}],"female":[{"display":"2:20","seconds":140},{"display":"2:15","seconds":135},{"display":"2:10","seconds":130},{"display":"2:05","seconds":125},{"display":"2:00","seconds":120},{"display":"1:55","seconds":115},{"display":"1:50","seconds":110},{"display":"1:45","seconds":105},{"display":"1:40","seconds":100}]},
          {"awardedPoints":7,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"2:20","seconds":140},{"display":"2:15","seconds":135},{"display":"2:10","seconds":130},{"display":"2:05","seconds":125},{"display":"2:00","seconds":120},{"display":"1:55","seconds":115},{"display":"1:50","seconds":110},{"display":"1:45","seconds":105},{"display":"1:40","seconds":100}],"female":[{"display":"2:15","seconds":135},{"display":"2:10","seconds":130},{"display":"2:05","seconds":125},{"display":"2:00","seconds":120},{"display":"1:55","seconds":115},{"display":"1:50","seconds":110},{"display":"1:45","seconds":105},{"display":"1:40","seconds":100},{"display":"1:35","seconds":95}]},
          {"awardedPoints":6.5,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"2:15","seconds":135},{"display":"2:10","seconds":130},{"display":"2:05","seconds":125},{"display":"2:00","seconds":120},{"display":"1:55","seconds":115},{"display":"1:50","seconds":110},{"display":"1:45","seconds":105},{"display":"1:40","seconds":100},{"display":"1:35","seconds":95}],"female":[{"display":"2:10","seconds":130},{"display":"2:05","seconds":125},{"display":"2:00","seconds":120},{"display":"1:55","seconds":115},{"display":"1:50","seconds":110},{"display":"1:45","seconds":105},{"display":"1:40","seconds":100},{"display":"1:35","seconds":95},{"display":"1:30","seconds":90}]},
          {"awardedPoints":6,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"2:10","seconds":130},{"display":"2:05","seconds":125},{"display":"2:00","seconds":120},{"display":"1:55","seconds":115},{"display":"1:50","seconds":110},{"display":"1:45","seconds":105},{"display":"1:40","seconds":100},{"display":"1:35","seconds":95},{"display":"1:30","seconds":90}],"female":[{"display":"2:05","seconds":125},{"display":"2:00","seconds":120},{"display":"1:55","seconds":115},{"display":"1:50","seconds":110},{"display":"1:45","seconds":105},{"display":"1:40","seconds":100},{"display":"1:35","seconds":95},{"display":"1:30","seconds":90},{"display":"1:25","seconds":85}]},
          {"awardedPoints":5.5,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"2:05","seconds":125},{"display":"2:00","seconds":120},{"display":"1:55","seconds":115},{"display":"1:50","seconds":110},{"display":"1:45","seconds":105},{"display":"1:40","seconds":100},{"display":"1:35","seconds":95},{"display":"1:30","seconds":90},{"display":"1:25","seconds":85}],"female":[{"display":"2:00","seconds":120},{"display":"1:55","seconds":115},{"display":"1:50","seconds":110},{"display":"1:45","seconds":105},{"display":"1:40","seconds":100},{"display":"1:35","seconds":95},{"display":"1:30","seconds":90},{"display":"1:25","seconds":85},{"display":"1:20","seconds":80}]},
          {"awardedPoints":5,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"2:00","seconds":120},{"display":"1:55","seconds":115},{"display":"1:50","seconds":110},{"display":"1:45","seconds":105},{"display":"1:40","seconds":100},{"display":"1:35","seconds":95},{"display":"1:30","seconds":90},{"display":"1:25","seconds":85},{"display":"1:20","seconds":80}],"female":[{"display":"1:55","seconds":115},{"display":"1:50","seconds":110},{"display":"1:45","seconds":105},{"display":"1:40","seconds":100},{"display":"1:35","seconds":95},{"display":"1:30","seconds":90},{"display":"1:25","seconds":85},{"display":"1:20","seconds":80},{"display":"1:15","seconds":75}]},
          {"awardedPoints":4.5,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"1:55","seconds":115},{"display":"1:50","seconds":110},{"display":"1:45","seconds":105},{"display":"1:40","seconds":100},{"display":"1:35","seconds":95},{"display":"1:30","seconds":90},{"display":"1:25","seconds":85},{"display":"1:20","seconds":80},{"display":"1:15","seconds":75}],"female":[{"display":"1:50","seconds":110},{"display":"1:45","seconds":105},{"display":"1:40","seconds":100},{"display":"1:35","seconds":95},{"display":"1:30","seconds":90},{"display":"1:25","seconds":85},{"display":"1:20","seconds":80},{"display":"1:15","seconds":75},{"display":"1:10","seconds":70}]},
          {"awardedPoints":4,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"1:50","seconds":110},{"display":"1:45","seconds":105},{"display":"1:40","seconds":100},{"display":"1:35","seconds":95},{"display":"1:30","seconds":90},{"display":"1:25","seconds":85},{"display":"1:20","seconds":80},{"display":"1:15","seconds":75},{"display":"1:10","seconds":70}],"female":[{"display":"1:45","seconds":105},{"display":"1:40","seconds":100},{"display":"1:35","seconds":95},{"display":"1:30","seconds":90},{"display":"1:25","seconds":85},{"display":"1:20","seconds":80},{"display":"1:15","seconds":75},{"display":"1:10","seconds":70},{"display":"1:05","seconds":65}]},
          {"awardedPoints":3.5,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"1:45","seconds":105},{"display":"1:40","seconds":100},{"display":"1:35","seconds":95},{"display":"1:30","seconds":90},{"display":"1:25","seconds":85},{"display":"1:20","seconds":80},{"display":"1:15","seconds":75},{"display":"1:10","seconds":70},{"display":"1:05","seconds":65}],"female":[{"display":"1:40","seconds":100},{"display":"1:35","seconds":95},{"display":"1:30","seconds":90},{"display":"1:25","seconds":85},{"display":"1:20","seconds":80},{"display":"1:15","seconds":75},{"display":"1:10","seconds":70},{"display":"1:05","seconds":65},{"display":"1:00","seconds":60}]},
          {"awardedPoints":3,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"1:40","seconds":100},{"display":"1:35","seconds":95},{"display":"1:30","seconds":90},{"display":"1:25","seconds":85},{"display":"1:20","seconds":80},{"display":"1:15","seconds":75},{"display":"1:10","seconds":70},{"display":"1:05","seconds":65},{"display":"1:00","seconds":60}],"female":[{"display":"1:35","seconds":95},{"display":"1:30","seconds":90},{"display":"1:25","seconds":85},{"display":"1:20","seconds":80},{"display":"1:15","seconds":75},{"display":"1:10","seconds":70},{"display":"1:05","seconds":65},{"display":"1:00","seconds":60},{"display":":55","seconds":55}]},
          {"awardedPoints":2.5,"maximumScoring":false,"minimumPassing":true,"male":[{"display":"1:35","seconds":95},{"display":"1:30","seconds":90},{"display":"1:25","seconds":85},{"display":"1:20","seconds":80},{"display":"1:15","seconds":75},{"display":"1:10","seconds":70},{"display":"1:05","seconds":65},{"display":"1:00","seconds":60},{"display":":55","seconds":55}],"female":[{"display":"1:30","seconds":90},{"display":"1:25","seconds":85},{"display":"1:20","seconds":80},{"display":"1:15","seconds":75},{"display":"1:10","seconds":70},{"display":"1:05","seconds":65},{"display":"1:00","seconds":60},{"display":":55","seconds":55},{"display":":50","seconds":50}]}
        ]
      }
    },
    cardio: {
      twoMileRun: {
        id: "twoMileRun",
        label: "2-Mile Run",
        category: "cardio",
        unit: "min:sec",
        scoringDirection: "lower-is-better",
        page: 7,
        maximumPoints: 50,
        minimumPoints: 35,
        ageGroupOrder: ["under-25","25-29","30-34","35-39","40-44","45-49","50-54","55-59","60-and-over"],
        rows: [
          {"awardedPoints":50,"maximumScoring":true,"minimumPassing":false,"male":[{"display":"13:25","seconds":805,"qualifier":"at-or-below"},{"display":"13:35","seconds":815,"qualifier":"at-or-below"},{"display":"13:42","seconds":822,"qualifier":"at-or-below"},{"display":"13:56","seconds":836,"qualifier":"at-or-below"},{"display":"14:05","seconds":845,"qualifier":"at-or-below"},{"display":"14:30","seconds":870,"qualifier":"at-or-below"},{"display":"15:09","seconds":909,"qualifier":"at-or-below"},{"display":"15:28","seconds":928,"qualifier":"at-or-below"},{"display":"16:58","seconds":1018,"qualifier":"at-or-below"}],"female":[{"display":"15:30","seconds":930,"qualifier":"at-or-below"},{"display":"15:55","seconds":955,"qualifier":"at-or-below"},{"display":"16:10","seconds":970,"qualifier":"at-or-below"},{"display":"16:12","seconds":972,"qualifier":"at-or-below"},{"display":"16:45","seconds":1005,"qualifier":"at-or-below"},{"display":"16:55","seconds":1015,"qualifier":"at-or-below"},{"display":"17:10","seconds":1030,"qualifier":"at-or-below"},{"display":"17:43","seconds":1063,"qualifier":"at-or-below"},{"display":"18:20","seconds":1100,"qualifier":"at-or-below"}],"qualifier":"at-or-below"},
          {"awardedPoints":49.5,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"13:44","seconds":824},{"display":"13:54","seconds":834},{"display":"14:03","seconds":843},{"display":"14:18","seconds":858},{"display":"14:29","seconds":869},{"display":"14:54","seconds":894},{"display":"15:32","seconds":932},{"display":"15:52","seconds":952},{"display":"17:19","seconds":1039}],"female":[{"display":"16:00","seconds":960},{"display":"16:24","seconds":984},{"display":"16:40","seconds":1000},{"display":"16:43","seconds":1003},{"display":"17:15","seconds":1035},{"display":"17:26","seconds":1046},{"display":"17:43","seconds":1063},{"display":"18:16","seconds":1096},{"display":"18:54","seconds":1134}]},
          {"awardedPoints":49,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"14:03","seconds":843},{"display":"14:13","seconds":853},{"display":"14:24","seconds":864},{"display":"14:40","seconds":880},{"display":"14:53","seconds":893},{"display":"15:18","seconds":918},{"display":"15:55","seconds":955},{"display":"16:17","seconds":977},{"display":"17:40","seconds":1060}],"female":[{"display":"16:29","seconds":989},{"display":"16:54","seconds":1014},{"display":"17:11","seconds":1031},{"display":"17:14","seconds":1034},{"display":"17:46","seconds":1066},{"display":"17:57","seconds":1077},{"display":"18:16","seconds":1096},{"display":"18:49","seconds":1129},{"display":"19:28","seconds":1168}]},
          {"awardedPoints":48,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"14:22","seconds":862},{"display":"14:32","seconds":872},{"display":"14:45","seconds":885},{"display":"15:02","seconds":902},{"display":"15:17","seconds":917},{"display":"15:42","seconds":942},{"display":"16:18","seconds":978},{"display":"16:41","seconds":1001},{"display":"18:01","seconds":1081}],"female":[{"display":"16:59","seconds":1019},{"display":"17:23","seconds":1043},{"display":"17:41","seconds":1061},{"display":"17:45","seconds":1065},{"display":"18:16","seconds":1096},{"display":"18:28","seconds":1108},{"display":"18:48","seconds":1128},{"display":"19:22","seconds":1162},{"display":"20:02","seconds":1202}]},
          {"awardedPoints":47,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"14:41","seconds":881},{"display":"14:51","seconds":891},{"display":"15:06","seconds":906},{"display":"15:24","seconds":924},{"display":"15:41","seconds":941},{"display":"16:05","seconds":965},{"display":"16:41","seconds":1001},{"display":"17:06","seconds":1026},{"display":"18:22","seconds":1102}],"female":[{"display":"17:29","seconds":1049},{"display":"17:52","seconds":1072},{"display":"18:11","seconds":1091},{"display":"18:16","seconds":1096},{"display":"18:46","seconds":1126},{"display":"18:59","seconds":1139},{"display":"19:21","seconds":1161},{"display":"19:54","seconds":1194},{"display":"20:36","seconds":1236}]},
          {"awardedPoints":46,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"15:00","seconds":900},{"display":"15:10","seconds":910},{"display":"15:28","seconds":928},{"display":"15:46","seconds":946},{"display":"16:05","seconds":965},{"display":"16:29","seconds":989},{"display":"17:04","seconds":1024},{"display":"17:30","seconds":1050},{"display":"18:44","seconds":1124}],"female":[{"display":"17:58","seconds":1078},{"display":"18:21","seconds":1101},{"display":"18:41","seconds":1121},{"display":"18:47","seconds":1127},{"display":"19:17","seconds":1157},{"display":"19:30","seconds":1170},{"display":"19:54","seconds":1194},{"display":"20:27","seconds":1227},{"display":"21:10","seconds":1270}]},
          {"awardedPoints":45,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"15:19","seconds":919},{"display":"15:29","seconds":929},{"display":"15:49","seconds":949},{"display":"16:08","seconds":968},{"display":"16:29","seconds":989},{"display":"16:53","seconds":1013},{"display":"17:27","seconds":1047},{"display":"17:54","seconds":1074},{"display":"19:05","seconds":1145}],"female":[{"display":"18:28","seconds":1108},{"display":"18:51","seconds":1131},{"display":"19:12","seconds":1152},{"display":"19:17","seconds":1157},{"display":"19:47","seconds":1187},{"display":"20:01","seconds":1201},{"display":"20:27","seconds":1227},{"display":"21:00","seconds":1260},{"display":"21:44","seconds":1304}]},
          {"awardedPoints":44,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"15:38","seconds":938},{"display":"15:48","seconds":948},{"display":"16:10","seconds":970},{"display":"16:30","seconds":990},{"display":"16:53","seconds":1013},{"display":"17:17","seconds":1037},{"display":"17:50","seconds":1070},{"display":"18:19","seconds":1099},{"display":"19:26","seconds":1166}],"female":[{"display":"18:58","seconds":1138},{"display":"19:20","seconds":1160},{"display":"19:42","seconds":1182},{"display":"19:48","seconds":1188},{"display":"20:17","seconds":1217},{"display":"20:32","seconds":1232},{"display":"20:59","seconds":1259},{"display":"21:33","seconds":1293},{"display":"22:18","seconds":1338}]},
          {"awardedPoints":43,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"15:57","seconds":957},{"display":"16:07","seconds":967},{"display":"16:31","seconds":991},{"display":"16:52","seconds":1012},{"display":"17:17","seconds":1037},{"display":"17:41","seconds":1061},{"display":"18:13","seconds":1093},{"display":"18:43","seconds":1123},{"display":"19:47","seconds":1187}],"female":[{"display":"19:27","seconds":1167},{"display":"19:49","seconds":1189},{"display":"20:12","seconds":1212},{"display":"20:19","seconds":1219},{"display":"20:48","seconds":1248},{"display":"21:03","seconds":1263},{"display":"21:32","seconds":1292},{"display":"22:06","seconds":1326},{"display":"22:52","seconds":1372}]},
          {"awardedPoints":42,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"16:16","seconds":976},{"display":"16:26","seconds":986},{"display":"16:52","seconds":1012},{"display":"17:14","seconds":1034},{"display":"17:41","seconds":1061},{"display":"18:05","seconds":1085},{"display":"18:36","seconds":1116},{"display":"19:08","seconds":1148},{"display":"20:08","seconds":1208}],"female":[{"display":"19:57","seconds":1197},{"display":"20:18","seconds":1218},{"display":"20:42","seconds":1242},{"display":"20:50","seconds":1250},{"display":"21:18","seconds":1278},{"display":"21:34","seconds":1294},{"display":"22:05","seconds":1325},{"display":"22:39","seconds":1359},{"display":"23:26","seconds":1406}]},
          {"awardedPoints":41,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"16:35","seconds":995},{"display":"16:45","seconds":1005},{"display":"17:13","seconds":1033},{"display":"17:36","seconds":1056},{"display":"18:05","seconds":1085},{"display":"18:29","seconds":1109},{"display":"19:00","seconds":1140},{"display":"19:32","seconds":1172},{"display":"20:29","seconds":1229}],"female":[{"display":"20:27","seconds":1227},{"display":"20:48","seconds":1248},{"display":"21:13","seconds":1273},{"display":"21:21","seconds":1281},{"display":"21:49","seconds":1309},{"display":"22:05","seconds":1325},{"display":"22:38","seconds":1358},{"display":"23:12","seconds":1392},{"display":"24:00","seconds":1440}]},
          {"awardedPoints":40,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"16:54","seconds":1014},{"display":"17:04","seconds":1024},{"display":"17:34","seconds":1054},{"display":"17:58","seconds":1078},{"display":"18:28","seconds":1108},{"display":"18:52","seconds":1132},{"display":"19:23","seconds":1163},{"display":"19:56","seconds":1196},{"display":"20:50","seconds":1250}],"female":[{"display":"20:56","seconds":1256},{"display":"21:17","seconds":1277},{"display":"21:43","seconds":1303},{"display":"21:52","seconds":1312},{"display":"22:19","seconds":1339},{"display":"22:36","seconds":1356},{"display":"23:10","seconds":1390},{"display":"23:44","seconds":1424},{"display":"24:34","seconds":1474}]},
          {"awardedPoints":39,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"17:13","seconds":1033},{"display":"17:23","seconds":1043},{"display":"17:55","seconds":1075},{"display":"18:20","seconds":1100},{"display":"18:52","seconds":1132},{"display":"19:16","seconds":1156},{"display":"19:46","seconds":1186},{"display":"20:21","seconds":1221},{"display":"21:11","seconds":1271}],"female":[{"display":"21:26","seconds":1286},{"display":"21:46","seconds":1306},{"display":"22:13","seconds":1333},{"display":"22:23","seconds":1343},{"display":"22:49","seconds":1369},{"display":"23:07","seconds":1387},{"display":"23:43","seconds":1423},{"display":"24:17","seconds":1457},{"display":"25:08","seconds":1508}]},
          {"awardedPoints":38.5,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"17:32","seconds":1052},{"display":"17:42","seconds":1062},{"display":"18:16","seconds":1096},{"display":"18:42","seconds":1122},{"display":"19:16","seconds":1156},{"display":"19:40","seconds":1180},{"display":"20:09","seconds":1209},{"display":"20:45","seconds":1245},{"display":"21:32","seconds":1292}],"female":[{"display":"21:55","seconds":1315},{"display":"22:15","seconds":1335},{"display":"22:43","seconds":1363},{"display":"22:54","seconds":1374},{"display":"23:20","seconds":1400},{"display":"23:38","seconds":1418},{"display":"24:16","seconds":1456},{"display":"24:50","seconds":1490},{"display":"25:42","seconds":1542}]},
          {"awardedPoints":38,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"17:51","seconds":1071},{"display":"18:01","seconds":1081},{"display":"18:37","seconds":1117},{"display":"19:04","seconds":1144},{"display":"19:40","seconds":1180},{"display":"20:04","seconds":1204},{"display":"20:32","seconds":1232},{"display":"21:10","seconds":1270},{"display":"21:53","seconds":1313}],"female":[{"display":"22:25","seconds":1345},{"display":"22:45","seconds":1365},{"display":"23:14","seconds":1394},{"display":"23:25","seconds":1405},{"display":"23:50","seconds":1430},{"display":"24:09","seconds":1449},{"display":"24:49","seconds":1489},{"display":"25:23","seconds":1523},{"display":"26:16","seconds":1576}]},
          {"awardedPoints":37.5,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"18:10","seconds":1090},{"display":"18:20","seconds":1100},{"display":"18:59","seconds":1139},{"display":"19:26","seconds":1166},{"display":"20:04","seconds":1204},{"display":"20:28","seconds":1228},{"display":"20:55","seconds":1255},{"display":"21:34","seconds":1294},{"display":"22:15","seconds":1335}],"female":[{"display":"22:55","seconds":1375},{"display":"23:14","seconds":1394},{"display":"23:44","seconds":1424},{"display":"23:56","seconds":1436},{"display":"24:20","seconds":1460},{"display":"24:40","seconds":1480},{"display":"25:21","seconds":1521},{"display":"25:56","seconds":1556},{"display":"26:50","seconds":1610}]},
          {"awardedPoints":37,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"18:29","seconds":1109},{"display":"18:39","seconds":1119},{"display":"19:20","seconds":1160},{"display":"19:48","seconds":1188},{"display":"20:28","seconds":1228},{"display":"20:52","seconds":1252},{"display":"21:18","seconds":1278},{"display":"21:58","seconds":1318},{"display":"22:27","seconds":1347}],"female":[{"display":"23:
                      {"awardedPoints":37,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"18:29","seconds":1109},{"display":"18:39","seconds":1119},{"display":"19:20","seconds":1160},{"display":"19:48","seconds":1188},{"display":"20:28","seconds":1228},{"display":"20:52","seconds":1252},{"display":"21:18","seconds":1278},{"display":"21:58","seconds":1318},{"display":"22:27","seconds":1347}],"female":[{"display":"23:24","seconds":1404},{"display":"23:43","seconds":1423},{"display":"24:14","seconds":1454},{"display":"24:26","seconds":1466},{"display":"24:51","seconds":1491},{"display":"25:11","seconds":1511},{"display":"25:54","seconds":1554},{"display":"26:29","seconds":1589},{"display":"27:24","seconds":1644}]},
          {"awardedPoints":36.5,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"18:48","seconds":1128},{"display":"18:58","seconds":1138},{"display":"19:41","seconds":1181},{"display":"20:10","seconds":1210},{"display":"20:52","seconds":1252},{"display":"21:15","seconds":1275},{"display":"21:41","seconds":1301},{"display":"22:23","seconds":1343},{"display":"22:36","seconds":1356}],"female":[{"display":"23:54","seconds":1434},{"display":"24:12","seconds":1452},{"display":"24:44","seconds":1484},{"display":"24:57","seconds":1497},{"display":"25:21","seconds":1521},{"display":"25:42","seconds":1542},{"display":"26:27","seconds":1587},{"display":"27:01","seconds":1621},{"display":"27:58","seconds":1678}]},
          {"awardedPoints":36,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"19:07","seconds":1147},{"display":"19:17","seconds":1157},{"display":"20:02","seconds":1202},{"display":"20:32","seconds":1232},{"display":"21:16","seconds":1276},{"display":"21:39","seconds":1299},{"display":"22:04","seconds":1324},{"display":"22:47","seconds":1367},{"display":"23:18","seconds":1398}],"female":[{"display":"24:24","seconds":1464},{"display":"24:42","seconds":1482},{"display":"25:15","seconds":1515},{"display":"25:28","seconds":1528},{"display":"25:51","seconds":1551},{"display":"26:13","seconds":1573},{"display":"27:00","seconds":1620},{"display":"27:34","seconds":1654},{"display":"28:32","seconds":1712}]},
          {"awardedPoints":35.5,"maximumScoring":false,"minimumPassing":false,"male":[{"display":"19:36","seconds":1176},{"display":"19:36","seconds":1176},{"display":"20:23","seconds":1223},{"display":"20:54","seconds":1254},{"display":"21:40","seconds":1300},{"display":"22:03","seconds":1323},{"display":"22:27","seconds":1347},{"display":"23:12","seconds":1392},{"display":"23:39","seconds":1419}],"female":[{"display":"24:53","seconds":1493},{"display":"25:11","seconds":1511},{"display":"25:45","seconds":1545},{"display":"25:59","seconds":1559},{"display":"26:22","seconds":1582},{"display":"26:44","seconds":1604},{"display":"27:32","seconds":1652},{"display":"28:07","seconds":1687},{"display":"29:06","seconds":1746}]},
          {"awardedPoints":35,"maximumScoring":false,"minimumPassing":true,"male":[{"display":"19:45","seconds":1185},{"display":"19:55","seconds":1195},{"display":"20:44","seconds":1244},{"display":"21:16","seconds":1276},{"display":"22:04","seconds":1324},{"display":"22:27","seconds":1347},{"display":"22:50","seconds":1370},{"display":"23:36","seconds":1416},{"display":"24:00","seconds":1440}],"female":[{"display":"25:23","seconds":1523},{"display":"25:40","seconds":1540},{"display":"26:15","seconds":1575},{"display":"26:30","seconds":1590},{"display":"26:52","seconds":1612},{"display":"27:15","seconds":1635},{"display":"28:05","seconds":1685},{"display":"28:40","seconds":1720},{"display":"29:40","seconds":1780}]}
        ]
      },
      hamr: {
        id: "hamr",
        label: "20-Meter HAMR",
        category: "cardio",
        unit: "shuttles",
        scoringDirection: "higher-is-better",
        page: 8,
        maximumPoints: 50,
        minimumPoints: 35,
        ageGroupOrder: ["under-25","25-29","30-34","35-39","40-44","45-49","50-54","55-59","60-and-over"],
        rows: [
          {"awardedPoints":50,"maximumScoring":true,"minimumPassing":false,"male":[87,85,84,82,81,77,71,69,65],"female":[68,65,63,63,59,58,57,53,50],"qualifier":"at-or-above"},
          {"awardedPoints":49.5,"maximumScoring":false,"minimumPassing":false,"male":[84,82,81,79,77,73,68,66,62],"female":[65,62,60,60,56,55,53,50,47]},
          {"awardedPoints":49,"maximumScoring":false,"minimumPassing":false,"male":[81,79,78,75,73,70,65,63,59],"female":[61,58,57,56,53,52,50,47,44]},
          {"awardedPoints":48,"maximumScoring":false,"minimumPassing":false,"male":[78,76,75,72,70,67,62,60,56],"female":[58,55,53,53,50,49,47,44,41]},
          {"awardedPoints":47,"maximumScoring":false,"minimumPassing":false,"male":[75,74,72,69,67,64,60,57,54],"female":[55,52,51,50,47,46,44,42,38]},
          {"awardedPoints":46,"maximumScoring":false,"minimumPassing":false,"male":[72,71,69,66,64,61,57,55,52],"female":[52,50,48,47,45,44,42,39,36]},
          {"awardedPoints":45,"maximumScoring":false,"minimumPassing":false,"male":[70,69,66,64,61,58,55,52,49],"female":[49,47,45,45,42,41,39,37,34]},
          {"awardedPoints":44,"maximumScoring":false,"minimumPassing":false,"male":[67,66,63,61,58,56,53,50,47],"female":[46,44,43,42,40,39,37,34,32]},
          {"awardedPoints":43,"maximumScoring":false,"minimumPassing":false,"male":[65,64,61,59,56,53,50,48,45],"female":[44,42,40,40,38,37,35,32,29]},
          {"awardedPoints":42,"maximumScoring":false,"minimumPassing":false,"male":[63,62,59,56,53,51,48,45,43],"female":[41,40,38,37,35,34,32,30,27]},
          {"awardedPoints":41,"maximumScoring":false,"minimumPassing":false,"male":[60,59,56,54,51,49,46,43,41],"female":[39,38,36,35,33,32,30,28,26]},
          {"awardedPoints":40,"maximumScoring":false,"minimumPassing":false,"male":[58,57,54,52,49,47,44,41,39],"female":[37,36,34,33,31,30,28,26,24]},
          {"awardedPoints":39,"maximumScoring":false,"minimumPassing":false,"male":[56,55,52,50,47,45,42,40,38],"female":[35,34,32,31,30,29,26,25,22]},
          {"awardedPoints":38.5,"maximumScoring":false,"minimumPassing":false,"male":[54,53,50,48,45,43,40,38,36],"female":[33,32,30,29,28,27,25,23,20]},
          {"awardedPoints":38,"maximumScoring":false,"minimumPassing":false,"male":[52,52,48,46,43,41,39,36,34],"female":[31,30,28,28,26,25,23,21,19]},
          {"awardedPoints":37.5,"maximumScoring":false,"minimumPassing":false,"male":[51,50,46,44,41,39,37,34,33],"female":[29,28,26,26,24,23,21,20,18]},
          {"awardedPoints":37,"maximumScoring":false,"minimumPassing":false,"male":[49,48,44,42,39,37,35,33,31],"female":[28,26,25,24,23,22,20,18,17]},
          {"awardedPoints":36.5,"maximumScoring":false,"minimumPassing":false,"male":[47,46,43,40,37,36,34,31,30],"female":[26,25,23,23,21,20,18,17,14]},
          {"awardedPoints":36,"maximumScoring":false,"minimumPassing":false,"male":[46,45,41,39,36,34,32,30,28],"female":[24,23,22,21,20,19,17,15,13]},
          {"awardedPoints":35.5,"maximumScoring":false,"minimumPassing":false,"male":[44,43,39,37,34,32,31,28,27],"female":[23,22,20,20,19,18,16,14,12]},
          {"awardedPoints":35,"maximumScoring":false,"minimumPassing":true,"male":[42,42,38,36,32,31,30,27,26],"female":[21,20,19,18,17,16,14,13,11]}
        ]
      }
    },
    medicalWalk: {
      twoKilometerWalk: {
        id: "twoKilometerWalk",
        label: "2-Kilometer Walk",
        category: "medicalWalk",
        unit: "min:sec",
        scoringDirection: "pass-fail",
        page: 11,
        resultType: "pass-fail",
        awardedPoints: null,
        ageGroups: ["under-30","30-39","40-49","50-59","60-and-over"],
        rows: [
          {"ageGroup":"under-30","male":{"display":"16:16","seconds":976,"qualifier":"at-or-below"},"female":{"display":"17:22","seconds":1042,"qualifier":"at-or-below"},"qualifier":"at-or-below","resultType":"pass-fail"},
          {"ageGroup":"30-39","male":{"display":"16:18","seconds":978,"qualifier":"at-or-below"},"female":{"display":"17:28","seconds":1048,"qualifier":"at-or-below"},"qualifier":"at-or-below","resultType":"pass-fail"},
          {"ageGroup":"40-49","male":{"display":"16:23","seconds":983,"qualifier":"at-or-below"},"female":{"display":"17:49","seconds":1069,"qualifier":"at-or-below"},"qualifier":"at-or-below","resultType":"pass-fail"},
          {"ageGroup":"50-59","male":{"display":"16:40","seconds":1000,"qualifier":"at-or-below"},"female":{"display":"18:11","seconds":1091,"qualifier":"at-or-below"},"qualifier":"at-or-below","resultType":"pass-fail"},
          {"ageGroup":"60-and-over","male":{"display":"16:58","seconds":1018,"qualifier":"at-or-below"},"female":{"display":"18:53","seconds":1133,"qualifier":"at-or-below"},"qualifier":"at-or-below","resultType":"pass-fail"}
        ]
      }
    }
  }
});
