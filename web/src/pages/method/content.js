// The Method page's words and facts (redesign, 14 Nov 2026). Every date, grid size and test result here was
// checked against config/settings.yaml, the pipeline reports in the published site data and the status record
// before it was written. Nothing on this page is computed: it explains how the record is built.

export const INTRO = {
  title: 'How S.H.I.F.T builds one continuous fire record',
  lede: 'NASA\'s MODIS instruments have mapped active fires since 2000. The VIIRS instruments took over from 2012 with pixels '
    + 'covering about one seventh of the area, so they see many small fires MODIS misses. Joined end to end, the two records show fires '
    + 'jumping about 2.6 times in 2012. That jump is the satellite, not the planet. S.H.I.F.T measures how each place\'s '
    + 'fires look to both sensors in the years they flew together, and puts the older years on the newer scale.',
  stages: [
    { id: 'modis', label: 'MODIS years', sub: '2002 to 2011',
      text: 'Terra and Aqua MODIS, 1 km pixels. The only satellite fire record before 2012. On its own scale it counts '
        + 'fewer, larger fires than VIIRS would have seen.' },
    { id: 'diff', label: 'Sensor differences', sub: 'measured 2012 to 2019',
      text: 'In the years both flew, S.H.I.F.T compares the two sensors place by place and month by month. The ratio '
        + 'differs between savanna, cropland, peat and boreal forest, and between seasons.' },
    { id: 'harm', label: 'Harmonisation', sub: 'factor per place and month',
      text: 'Each MODIS value before 2012 is multiplied by the factor for its 2.5° cell and calendar month. Each converted '
        + 'value carries a range for the conversion error.' },
    { id: 'record', label: 'One record', sub: 'on the VIIRS scale, 2002 to today',
      text: 'From 20 January 2012 the record is VIIRS on Suomi NPP itself, with gaps filled from a partner satellite. '
        + 'Before that it is MODIS put on the same scale. A month in 2004 can be compared with a month in 2024.' },
  ],
};

// The six steps, in the order the pipeline runs them.
export const STEPS = [
  { id: 'collect', title: 'Collect the satellite detections',
    short: 'Every MODIS and VIIRS active-fire detection from NASA FIRMS, 1 January 2002 to 28 October 2026.',
    detail: [
      'MODIS Collection 6.1 from Terra (in the record from 1 January 2002) and Aqua (fire data from 4 July 2002). '
        + 'January to June 2002 has Terra only and is not compared with later years, so normals start in 2003.',
      'VIIRS 375 m from Suomi NPP (from 20 January 2012), the reference every value is put on, and from NOAA-20 '
        + '(from 2018), which fills Suomi NPP gaps and carries the record on.',
      'Low-confidence detections are dropped for both sensors, which define "low" differently. Keeping them was '
        + 'tested and did not make the record more consistent.',
    ] },
  { id: 'hotspots', title: 'Count hotspots, not detections',
    short: 'A hotspot is a 0.05° cell (about 5 km) with at least one fire detection on a UTC day.',
    detail: [
      'A VIIRS pixel is 375 m across, a MODIS pixel about 1 km. One fire can give VIIRS several detections where '
        + 'MODIS gives one or two. Counting burning cells instead of detections means a '
        + 'finer sensor inflates the count much less (joined raw, hotspots still jump about 2.6 times in 2012, which is why the next steps are needed).',
      'A hotspot is not a wildfire: one large fire covers many hotspots, and one hotspot can hold several small fires.',
      'Fire power is the fire radiative power of the detections, summed per cell and day (MW). It is an index of '
        + 'how strongly the area burned, not the total energy released.',
    ] },
  { id: 'nonfire', title: 'Remove heat that is not fire',
    short: 'Volcanoes, gas flares, industry and offshore platforms are taken out in every year.',
    detail: [
      'Remove gas flares, industry, volcanoes and offshore platforms that NASA labelled as non-fire, in every year. '
        + 'NASA FIRMS gives each standard detection a type: vegetation fire, active volcano, other static land source '
        + '(gas flares and industry) or offshore.',
      'S.H.I.F.T also builds a mask of cells where heat shows up in the same place year after year, and removes them '
        + 'in every year. The map shows them with "Show heat that isn\'t fire".',
      'Near-real-time data has no type label, so for July to October 2026 only this mask removes non-fire heat.',
    ] },
  { id: 'calibrate', title: 'Calibrate by place and season',
    short: 'For each 2.5° cell and calendar month, a factor: VIIRS (Suomi NPP) divided by MODIS, in the years both flew.',
    detail: [
      'The factors used for every year before 2012 come from Terra and Aqua together, fitted on 2012 to 2019. From 2020 '
        + 'Terra\'s orbit drifts, so Aqua alone has its own factors (fitted on 2020 to 2025), used only to fill gaps.',
      'There is one factor for hotspots and one for fire power, for each 2.5° cell (about 280 km) and each of the 12 '
        + 'calendar months.',
      'Cells with little fire lean on their 10° neighbourhood (pulled towards the factor of the 10° tile around '
        + 'them). This keeps sparse cells usable, but it does not guarantee they are right locally, and their ranges are wider.',
      'The 2.5° size was chosen over 10° tiles by a rule written down before the comparison was run.',
    ] },
  { id: 'gaps', title: 'Fill satellite gaps, or mark them',
    short: 'When the main satellite missed a day, a partner flying close in time fills it. Otherwise the day is "no data".',
    detail: [
      'Fill satellite outages from a partner satellite flying close in time, tested to within about 2 to 6 percent on '
        + 'simulated outages (monthly totals). Counting the gap as zero fire would have been about 32 to 36 percent off.',
      'Suomi NPP gaps are filled from NOAA-20, for example 28 April to 2 June 2026. Before 2012, a missing MODIS '
        + 'satellite is filled from the other one.',
      'From February 2023 Aqua flies past its 13:45 science limit, so it no longer fills Suomi NPP gaps.',
      'Where no partner saw the area, the day is shown as no data (hatched), never as a quiet day.',
    ] },
  { id: 'record', title: 'One record on the VIIRS scale',
    short: 'From 20 January 2012 the record is Suomi NPP itself. Before that, MODIS times the factor, with a range.',
    detail: [
      'Carry the record past 2 November 2026, 13:00 UTC, when NASA FIRMS stopped producing Suomi NPP data (NASA FIRMS FAQ), '
        + 'with NOAA-20 tied to it.',
      'The record runs daily on a 0.25° map grid and is summed over 1° cells for any area you choose.',
      'The recent detections layer (NOAA-20 and NOAA-21, from 28 October 2026) is separate: raw FIRMS points, never '
        + 'added to the record and never given an anomaly class.',
    ] },
];

// Satellites: dates from the record (meta.json, status record) and NASA FIRMS. Segments are drawn on a timeline.
// kind: source (MODIS put on the VIIRS scale), reference (the scale itself), fill (fills gaps only),
// recent (raw recent layer, not harmonised), gap (no data from this satellite), off (in orbit, not used).
export const SENSORS = [
  { id: 'terra', name: 'Terra MODIS', product: 'MODIS Collection 6.1 active fires (MCD14ML)', res: '1 km', link: 'https://doi.org/10.5067/FIRMS/MODIS/MCD14ML',
    period: 'In the record from 1 January 2002', segments: [['2002-01-01', '2012-01-19', 'source'], ['2012-01-20', '2019-12-31', 'fill'], ['2020-01-01', '2026-10-28', 'off']],
    role: 'With Aqua, the source of every value before 2012 (put on the VIIRS scale). From 2012 to 2019 the years the factors are fitted on, and with Aqua a gap filler for Suomi NPP. Not used from 2020.',
    limits: 'January to June 2002 is Terra only and not compared. Its orbit drifts after 2020: in 2026 it sees about 40% of what Aqua sees.' },
  { id: 'aqua', name: 'Aqua MODIS', product: 'MODIS Collection 6.1 active fires (MCD14ML)', res: '1 km', link: 'https://doi.org/10.5067/FIRMS/MODIS/MCD14ML',
    period: 'Fire data from 4 July 2002', segments: [['2002-07-04', '2012-01-19', 'source'], ['2012-01-20', '2023-01-31', 'fill'], ['2023-02-01', '2026-10-28', 'off']],
    role: 'With Terra, the source of every value before 2012. From 2012 a gap filler for Suomi NPP, and from 2020 alone, with its own factors fitted on 2020 to 2025.',
    limits: 'Past its 13:45 science limit since February 2023, so it no longer fills gaps from then on.' },
  { id: 'snpp', name: 'Suomi NPP VIIRS', product: 'VIIRS 375 m active fires (VNP14IMGT)', res: '375 m', link: 'https://doi.org/10.5067/FIRMS/VIIRS/VNP14IMGT_NRT.002',
    period: '20 January 2012 to 28 October 2026 in the record', segments: [['2012-01-20', '2026-04-27', 'reference'], ['2026-04-28', '2026-06-02', 'gap'], ['2026-06-03', '2026-10-28', 'reference']],
    role: 'The reference: the record is on its scale, and from 2012 the record is its own data.',
    limits: 'No data 28 April to 2 June 2026 (filled from NOAA-20). July to October 2026 is near-real-time data, provisional. NASA FIRMS stopped producing its data at 13:00 UTC on 2 November 2026.' },
  { id: 'noaa20', name: 'NOAA-20 VIIRS', product: 'VIIRS 375 m active fires (VJ114IMGT)', res: '375 m', link: 'https://doi.org/10.5067/FIRMS/VIIRS/VJ114IMGT_NRT.002',
    period: 'From 2018', segments: [['2018-01-01', '2026-10-27', 'fill'], ['2026-10-28', '2026-11-14', 'recent']],
    role: 'Fills Suomi NPP gaps and is tied to it (NOAA-20 sees 1.00 to 1.05 times as many hotspots), so it can carry the record on. From 28 October 2026 also in the recent detections layer.',
    limits: 'In the recent layer its points are raw FIRMS near-real-time data, not harmonised.' },
  { id: 'noaa21', name: 'NOAA-21 VIIRS', product: 'VIIRS 375 m active fires NRT (VJ214IMGT)', res: '375 m', link: 'https://www.earthdata.nasa.gov/learn/find-data/near-real-time/firms/vj214imgtdlnrt',
    period: 'In the recent layer from 28 October 2026', segments: [['2026-10-28', '2026-11-14', 'recent']],
    role: 'Recent detections layer only.',
    limits: 'Not tested against Suomi NPP by S.H.I.F.T, so never used in the harmonised record.' },
];
export const SEGMENT_KINDS = {
  source: 'MODIS source, put on the VIIRS scale', reference: 'Reference: the record\'s scale', fill: 'Fills gaps only',
  recent: 'Recent layer, raw (not harmonised)', gap: 'No data from this satellite', off: 'Not used',
};

// The Explore features, each with a real screenshot of the live site.
export const FEATURES = [
  { id: 'compare', title: 'Now against the past', img: 'method/compare.webp', shot: 'Bangladesh, 1 to 28 October 2026',
    what: 'The chosen dates against the same dates in every year from 2003: the median of the complete years, the rank and the ratio. Years with a satellite gap in those dates are left out.',
    measures: 'Hotspots or fire power, summed over the dates', open: { area: 'country:bangladesh', v: 'cells', from: '2026-10-01', to: '2026-10-28' } },
  { id: 'season', title: 'When the fire season comes', img: 'method/season.webp', shot: 'Bangladesh',
    what: 'The average year for the area, smoothed over a month. The season runs from the day 10% of a normal year\'s fire has burned to the day 90% has, counted from the quietest point of the year.',
    measures: 'Share of a normal year\'s fire by day of the year', open: { area: 'country:bangladesh', v: 'cells', from: '2026-10-01', to: '2026-10-28' } },
  { id: 'calendar', title: 'Every day since 2002', img: 'method/calendar.webp', shot: 'Bangladesh',
    what: 'One square per day, one row per year. Days with no satellite data are hatched, not shown as quiet. Days before 20 January 2012 are indicative.',
    measures: 'Daily hotspots or fire power', open: { area: 'country:bangladesh', v: 'cells', from: '2026-10-01', to: '2026-10-28' } },
  { id: 'months', title: 'Each month against its normal', img: 'method/months.webp', shot: 'Bangladesh',
    what: 'The z score of log(1 + value) against the same month of the baseline years. Below -1 is low, up to 1 normal, up to 2 unusual, 2 and above critical. Where a normal year has fewer than 60 hotspots, one or two detections can make a month look critical, so the page does not summarise the classes for such areas and marks their colours as noise.',
    measures: 'Statistical classes, not danger ratings', open: { area: 'country:bangladesh', v: 'cells', from: '2026-10-01', to: '2026-10-28' } },
  { id: 'trend', title: 'Monthly totals', img: 'method/trend.webp', shot: 'Bangladesh',
    what: 'Every month since 2002, with the conversion range shaded for the years before 2012.',
    measures: 'Monthly hotspots or fire power', open: { area: 'country:bangladesh', v: 'cells', from: '2026-10-01', to: '2026-10-28' } },
  { id: 'weather', title: 'Weather at the time', img: 'method/weather.webp', shot: 'Southeast Australia, September 2019 to February 2020',
    what: 'NASA POWER daily rain, humidity, daily maximum temperature, wind and root-zone soil wetness over the same dates as "Now against the past", against the same dates in the baseline years (median, difference and rank), plus rain in the 60 days before. UTC days, the mean of up to nine land points spread across the area (points over water are left out). The rules were written down before the data were fetched (context/power_rules.json). Weather is context only: it is never used in the harmonised record, the month classes or any score, and it does not show why fires burned.',
    measures: 'Preset areas only', open: { area: 'preset:se_australia', v: 'cells', from: '2019-09-01', to: '2020-02-29' } },
  { id: 'search', title: 'Choose any area', img: 'method/search.webp', shot: 'the search bar',
    what: 'Search a country or preset, type coordinates, or draw a shape with the pen. Every area is summed on 1° cells: a cell counts when its centre is inside.',
    measures: 'Areas accurate to about 100 km at the edges', open: {} },
  { id: 'downloads', title: 'Download and share', img: 'method/downloads.webp', shot: 'Bangladesh',
    what: 'Daily totals, the monthly table with classes and hotspots per 1° cell and day as CSV, chart pictures, a share link and a printable one-page brief.',
    measures: 'The same numbers as on screen', open: { area: 'country:bangladesh', v: 'cells', from: '2026-10-01', to: '2026-10-28' } },
];

// Data sources. use: what the source is used for (only 'record' sources make the fire numbers).
export const SOURCE_GROUPS = {
  nasa: 'NASA satellite fire data', context: 'NASA environmental context', other: 'Comparison and geography', papers: 'Publications',
};
export const USES = { record: 'Builds the fire record', recent: 'Recent layer only', check: 'Check only', context: 'Context only', map: 'Map only' };
export const SOURCES = [
  { group: 'nasa', use: 'record', name: 'MODIS Collection 6.1 Active Fire Detections (MCD14ML, MCD14DL)', org: 'NASA FIRMS',
    id: 'doi:10.5067/FIRMS/MODIS/MCD14ML', link: 'https://doi.org/10.5067/FIRMS/MODIS/MCD14ML', dates: 'Terra and Aqua, 2002 to 2026', units: 'detections, MW',
    detail: 'The source of every value before 2012, and of gap fills.' },
  { group: 'nasa', use: 'record', name: 'VIIRS 375 m Active Fire, Suomi NPP (VNP14IMGT)', org: 'NASA FIRMS',
    id: 'doi:10.5067/FIRMS/VIIRS/VNP14IMGT_NRT.002', link: 'https://doi.org/10.5067/FIRMS/VIIRS/VNP14IMGT_NRT.002', dates: '20 January 2012 to 28 October 2026', units: 'detections, MW',
    detail: 'The reference scale and, from 2012, the record itself.' },
  { group: 'nasa', use: 'record', name: 'VIIRS 375 m Active Fire, NOAA-20 (VJ114IMGT)', org: 'NASA FIRMS',
    id: 'doi:10.5067/FIRMS/VIIRS/VJ114IMGT_NRT.002', link: 'https://doi.org/10.5067/FIRMS/VIIRS/VJ114IMGT_NRT.002', dates: 'From 2018', units: 'detections, MW',
    detail: 'Fills Suomi NPP gaps and is tied to it.' },
  { group: 'nasa', use: 'recent', name: 'Recent detections only: VIIRS 375 m Active Fire NRT, NOAA-20 and NOAA-21 (VJ214IMGT), from the NASA FIRMS Area API (VIIRS_NOAA20_NRT, VIIRS_NOAA21_NRT)',
    org: 'NASA FIRMS', id: 'VIIRS_NOAA20_NRT, VIIRS_NOAA21_NRT', link: 'https://www.earthdata.nasa.gov/learn/find-data/near-real-time/firms/vj214imgtdlnrt', dates: 'From 28 October 2026, refreshed every few hours', units: 'detections, MW',
    detail: 'Shown raw with their fetch time. Never added to the record. NOAA-21 is not tested against Suomi NPP by S.H.I.F.T.' },
  { group: 'context', use: 'context', name: 'NASA POWER Daily API (v2.10.3, community AG, UTC)', org: 'NASA Langley Research Center',
    id: 'PRECTOTCORR, RH2M, T2M_MAX, WS2M, GWETROOT', link: 'https://power.larc.nasa.gov', dates: '2003 to 8 November 2026', units: 'mm, %, °C, m/s, 0 to 1',
    detail: 'Weather context only, from GMAO MERRA-2 and GEOS-IT. Fetched for the preset areas on the date shown in the weather notes.' },
  { group: 'context', use: 'check', name: 'MERRA-2 monthly total cloud fraction, M2TMNXRAD', org: 'NASA GMAO via GES DISC',
    id: 'M2TMNXRAD', link: 'https://disc.gsfc.nasa.gov', dates: 'To August 2026', units: 'fraction',
    detail: 'Cloud flag only: months cloudier than 90% of years carry a flag.' },
  { group: 'context', use: 'map', name: 'NASA GIBS: Blue Marble and daily MODIS Terra or VIIRS Suomi NPP true colour', org: 'NASA ESDIS',
    id: 'GIBS WMTS', link: 'https://nasa-gibs.github.io/gibs-api-docs/', dates: 'Daily pictures from 24 February 2000', units: 'picture',
    detail: 'Optional map backdrop (online only). A picture only, never used in any number.' },
  { group: 'other', use: 'check', name: 'GFED4 monthly burned area', org: 'Giglio, Randerson and van der Werf',
    id: 'doi:10.1002/jgrg.20042', link: 'https://doi.org/10.1002/jgrg.20042', dates: 'Monthly, 0.25°', units: 'hectares',
    detail: 'Check only. Built from MODIS, so it is a consistency check, not independent ground truth.' },
  { group: 'other', use: 'map', name: 'Natural Earth (country borders, names, continents, oceans)', org: 'Natural Earth, via world-atlas',
    id: 'public domain', link: 'https://www.naturalearthdata.com', dates: '', units: '',
    detail: 'Country borders for the Country choice and the map. Names and international borders follow Natural Earth\'s de facto view.' },
  { group: 'other', use: 'map', name: 'geoBoundaries gbOpen (states, provinces, districts)', org: 'Runfola et al. (2020), PLoS ONE 15(4): e0231866',
    id: 'doi:10.1371/journal.pone.0231866', link: 'https://doi.org/10.1371/journal.pone.0231866', dates: '', units: '',
    detail: 'Map context only, never used in any number. Each country under its own licence (public domain, CC0, CC BY, government open licences, or ODbL 1.0 in separate files). Countries whose district licence is share-alike or unclear, or whose units are very small, show provinces instead.' },
  { group: 'other', use: 'map', name: 'Noto Sans (map labels)', org: 'SIL Open Font License', id: 'OFL', link: 'https://fonts.google.com/noto/specimen/Noto+Sans', dates: '', units: '',
    detail: 'Label font of the map.' },
  { group: 'papers', use: 'record', name: 'Giglio, Schroeder and Justice (2016), The collection 6 MODIS active fire detection algorithm and fire products',
    org: 'Remote Sensing of Environment 178', id: 'doi:10.1016/j.rse.2016.02.054', link: 'https://doi.org/10.1016/j.rse.2016.02.054', dates: '', units: '',
    detail: 'The MODIS detection algorithm behind the MODIS data.' },
  { group: 'papers', use: 'record', name: 'Schroeder, Oliva, Giglio and Csiszar (2014), The new VIIRS 375 m active fire detection data product',
    org: 'Remote Sensing of Environment 143', id: 'doi:10.1016/j.rse.2013.12.008', link: 'https://doi.org/10.1016/j.rse.2013.12.008', dates: '', units: '',
    detail: 'The VIIRS 375 m detection algorithm behind the VIIRS data.' },
];

export const SECTIONS = [
  ['overview', 'Overview'], ['process', 'How it works'], ['satellites', 'Satellites'],
  ['explore', 'What you can explore'], ['limits', 'Limitations'], ['sources', 'Data sources'],
];
