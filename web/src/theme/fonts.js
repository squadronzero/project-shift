// Font files bundled with the site, so it works with the wifi off (safe to edit). UI Trial 1.0 (14 Nov):
//   Space Grotesk   body text, navigation, controls, small and medium headings   (--font-ui)
//   Bodoni Moda     large editorial page headings only                           (--font-editorial)
//   IBM Plex Mono   coordinates, UTC times, satellite ids, numeric readouts      (--font-data)
//   Orbitron        the S.H.I.F.T wordmark only                                  (--font-brand)
// All four are under the SIL Open Font License 1.1 (each package ships its LICENSE). Orbitron stands in for
// the "Armstrong-inspired" wordmark of the Trial 1.0 preview: every font named Armstrong found is commercial
// (Device/Rian Hughes, Genesislab, Yellow Images) and the team holds no licence, so it is not used.
// Never link Google Fonts: the demo must work offline. Fontsource CSS uses font-display: swap.
import '@fontsource-variable/space-grotesk/index.css';
import '@fontsource-variable/bodoni-moda/index.css';
import '@fontsource-variable/orbitron/index.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
