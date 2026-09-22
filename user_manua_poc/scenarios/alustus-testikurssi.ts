import type { Scenario } from '../lib/types'

/**
 * Opettaja luo uuden alustuksen (promptin) Testikurssille: valitsee kurssin
 * kurssilistasta, avaa "uusi alustus" -lomakkeen, täyttää nimen ja ohjeet, ja
 * lopuksi ottaa juuri luodun alustuksen käyttöön.
 */
const scenario: Scenario = {
  title: 'Alustuksen luonti Testikurssille',
  run: async ({ page, caption, click, fill, pause }) => {
    const promptName = 'Harjoitusalustus'

    await page.goto('/general')
    await pause(500)

    await caption('Hei olen Sasa-I, AI-avustajasi. Tässä videossa luodaan uusi alustus Testikurssille.')

    await pause(500)

    await caption('Avataan alustuksen valintaikkuna.')
    await click(page.getByTestId('choose-prompt-button'))

    await caption('Valitaan kurssi: Testikurssi.')
    await click(page.getByTestId('show-course-info-test-course-button'))

    await caption('Luodaan uusi alustus kurssille plus-painikkeesta.')
    await click(page.getByTestId('create-course-prompt-test-course-course-id-button'))

    await caption('Annetaan alustukselle nimi.')
    await fill(page.getByTestId('prompt-name-input'), promptName)

    await caption('Kirjoitetaan ohje opiskelijalle: mihin alustus on tarkoitettu.')
    await fill(page.getByTestId('student-instructions-input'), 'Tämä alustus opastaa sinua Testikurssin harjoitustehtävän tekemisessä.')

    await caption('Kirjoitetaan tekoälylle ohjeistus eli system-viesti.')
    await fill(
      page.getByTestId('system-message-input'),
      'Olet ystävällinen avustaja, joka auttaa opiskelijoita Testikurssin harjoitustehtävissä. Vastaa selkeästi ja kannustavasti.',
    )

    await caption('Tallennetaan alustus.')
    await click(page.getByRole('button', { name: 'Save' }))

    await caption('Alustus on nyt luotu ja näkyy kurssin alustuslistassa.')
    await click(page.getByTestId(`prompt-row-${promptName}`))

    await caption('Otetaan juuri luotu alustus käyttöön.')
    await click(page.getByTestId('change-to-prompt-button'))

    await caption('Valmista! Testikurssin alustus on luotu ja otettu käyttöön.')
  },
}

export default scenario
