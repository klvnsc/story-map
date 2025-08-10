# GPS Track Data Review

## Current Database Status: 29 Tracks Imported

Please review the dates below against the original garmin.md source data and mark any corrections needed.

| Track | Start Date | End Date | Title | Phase | Notes |
|-------|------------|----------|-------|-------|-------|
| 1 | 2024-06-11 | 2024-06-11 | HONG KONG PREPARATION | hongkong_prep |  |
| 2 | 2024-06-12 | 2024-06-12 | Final Hong Kong Logistics | hongkong_prep |  |
| 3 | 2024-07-01 | 2024-07-18 | LAND ROVER DEFENDER EXPEDITION START | north_china |  |
| 4 | 2024-07-18 | 2024-07-18 | Siberian Transit | north_china |  |
| 5 | 2025-07-21 | 2024-08-04 | High Altitude Crossing | north_china |  |
| 6 | 2024-08-05 | 2024-08-13 | Central Asia Sprint | north_china |  |
| 7 | 2024-08-13 | 2024-08-15 | Mountain Rest Stop | north_china |  |
| 8 | 2024-08-15 | 2024-08-25 | Regional Movement | north_china |  |
| 9 | 2024-08-31 | 2024-10-16 | 🔥 EXPEDITION MARATHON | central_asia |  |
| 10 | 2024-10-17 | 2024-11-03 | Caucasus Crossing | middle_east |  |
| 11 | 2024-11-04 | 2024-11-20 | Turkey/Middle East | middle_east |  |
| 12 | 2024-11-20 | 2024-11-22 | Fast Transit | middle_east |  |
| 13 | 2024-11-22 | 2024-11-23 | High-Speed Road Transit | middle_east |  |
| 14 | 2024-11-25 | 2024-12-23 | Mediterranean Journey | middle_east |  |
| 15 | 2024-12-23 | 2024-12-24 | Holiday Stop | middle_east |  |
| 16 | 2025-01-01 | 2025-01-06 | New Year Preparation 16 | africa |  |
| 17 | 2025-01-01 | 2025-01-06 | New Year Preparation 17 | africa |  |
| 18 | 2025-01-01 | 2025-01-06 | New Year Preparation 18 | africa |  |
| 19 | 2025-01-06 | 2025-03-12 | AFRICAN/MEDITERRANEAN EPIC | africa |  |
| 20 | 2025-03-14 | 2025-04-21 | North African Return | europe |  |
| 21 | 2025-04-23 | 2025-05-03 | European Entry | europe |  |
| 22 | 2025-05-07 | 2025-05-11 | German Local Movement | europe |  |
| 23 | 2025-05-16 | 2025-05-19 | Pre-Germany Rest | europe |  |
| 24 | 2025-05-19 | 2025-05-25 | HIGH-VALUE TARGET | europe |  |
| 25 | 2025-05-25 | 2025-06-08 | Channel Crossing | scotland |  |
| 26 | 2025-06-08 | 2025-06-13 | English Transit | scotland |  |
| 27 | 2025-06-15 | 2025-06-20 | UK Approach | scotland |  |
| 28 | 2025-06-21 | 2025-06-24 | Scotland Approach | scotland |  |
| 29 | 2025-06-24 | 2025-07-02 | EXPEDITION FINALE | scotland |  |

## Instructions

1. **Review each track** against the original garmin.md source data
2. **Edit the Start Date/End Date columns** for any corrections needed
3. **Add notes** in the Notes column for any issues found
4. **Save the file** when done
5. **Let me know** and I'll generate the SQL UPDATE statements based on your corrections

## Known Issues to Check

- Track 5: Start date shows 2025-07-21 (likely should be 2024-07-21)
- Several tracks may need multi-day date ranges instead of single days
- Cross-reference with original expedition timeline: June 2024 - July 2025

## Reference

Original data source: `/data-cy-gps/garmin.md`
Current database table: `expedition_tracks`
Total tracks: 29/29 ✅