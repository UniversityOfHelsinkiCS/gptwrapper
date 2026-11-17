import i18next from 'i18next'
import { beforeAll, describe, expect, test } from 'vitest'
import en from '../../locales/en.json'
import fi from '../../locales/fi.json'
import { folderLabel } from './folderLabel'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.init({ resources: { en, fi }, lng: 'fi', fallbackLng: 'en', defaultNS: 'common' })
})

describe('folderLabel', () => {
  test("shows the app's own folders in the UI language", () => {
    expect(folderLabel(i18n.t, 'Outputs')).toBe('Tuotokset')
    expect(folderLabel(i18n.t, 'Agent notes')).toBe('Avustajan muistiinpanot')
    expect(folderLabel(i18n.t, 'Files')).toBe('Tiedostot')
  })

  test("shows the student's own folders as they are", () => {
    expect(folderLabel(i18n.t, 'Thesis')).toBe('Thesis')
    expect(folderLabel(i18n.t, 'outputs')).toBe('outputs')
  })
})
