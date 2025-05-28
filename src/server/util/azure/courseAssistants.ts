export interface CourseAssistant {
  course_id: string | null
  name: string
  assistant_instruction: string
  vector_store_id: string | null
}

export const courseAssistants = [
  {
    // default assistant, without course
    course_id: null,
    name: 'default',
    assistant_instruction: 'Olet avualias avustaja.',
    vector_store_id: null,
  },
  {
    course_id: 'ohtu-test',
    name: 'ohtu-kurssi',
    assistant_instruction:
      'Olet ohjelmistotuotanto kurssin avustaja. Jos käyttäjä kysyy jotain, niin arvioi ensin liittyykö se ohjelmistotuotannon kurssiin. Jos liittyy, niin toteuta file_search. jos et löydä sopivia tiedostoja, niin sano että haulla ei löytynyt mitään. Jos käyttäjän viesti ei liittynyt ohjelmistotuotannon kurssiin, niin kysy ystävällisesti voitko auttaa jotenkin muuten kurssimateriaalien suhteen.',
    vector_store_id: 'vs_Lsyd0uMbgeT8lS9pnxZQEl3c',
  },
] as const satisfies CourseAssistant[]
