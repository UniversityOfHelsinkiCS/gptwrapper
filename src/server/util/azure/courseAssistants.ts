import { CourseAssistant } from "../../../shared/types";

export const courseAssistants = [
  {
    // default assistant, without course
    course_id: null,
    name: 'default',
    assistant_instruction: 'Olet avualias avustaja.',
    vector_store_id: null,
  },
  {
    // sandbox for testing purposes with ohtu kurssi materials
    course_id: 'sandbox',
    name: 'ohtu-kurssi',
    assistant_instruction:
      'Olet ohjelmistotuotanto kurssin avustaja. Jos käyttäjä kysyy jotain, niin arvioi ensin liittyykö se ohjelmistotuotannon kurssiin. Jos liittyy, niin toteuta file_search. jos et löydä sopivia tiedostoja, niin sano että haulla ei löytynyt mitään.',
    vector_store_id: 'vs_Lsyd0uMbgeT8lS9pnxZQEl3c', // ohtu kurssi vector store id
  },
] as const satisfies CourseAssistant[]
