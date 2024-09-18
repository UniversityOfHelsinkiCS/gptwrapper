import InfoText from '../models/infotext'

const infoTexts = [
  {
    name: 'disclaimer',
    text: {
      fi: '### Kun käytät tekoälytyökaluja, vältä tietojen jakamista, joiden jakamisen luvallisuudesta sinulla ei ole varmuutta. Kun syötät tietoja tekoälytyökaluun, varmista, että otat huomioon mahdolliset luottamuksellisuusrajoitukset ja olet hankkinut tarvittavat tekijänoikeusluvat jne. annettujen tietojen jakamiseksi. Minkä tahansa luvattoman tiedon käyttö tekoälyjärjestelmissä voi johtaa kolmansien osapuolien immateriaalioikeuksien loukkaamiseen. \n \n ### CurreChat käyttää OpenAI:n kehittämiä suuria kielimalleja, jotka sijaitsevat Helsingin yliopiston Microsoft Azure -pilvipalvelussa EU-alueella. Palveluun syötettyjä tietoja ei käytetä kielimallin jatkokouluttamiseen. Käyttäjistä ei myöskään välity tunnistetietoja kielimallille. \n \n ### Jokaisella käyttäjällä on käytössään 75 000 tokenia GPT-4o -kielimalliin. Tämä saldo nollautuu kuukauden välein. Vähentääksesi tokenien kulutusta, kannattaa keskustelu tyhjentää TYHJENNÄ -painikkeesta aina, kun vaihdat keskustelun aihetta. \n \n ### Näet tokenien kulutuksen ja käytössä olevan kielimallin keskusteluikkunan alapuolella. \n ### Voit lukea suurten kielimallien käyttämistä tokeneista tarkemmin täältä: [https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them). \n \n ### Lisätietoa tekoälyn käytöstä opetuksessa löydät: [https://teaching.helsinki.fi/ohjeet/artikkeli/tekoaly-opetuksessa](https://teaching.helsinki.fi/ohjeet/artikkeli/tekoaly-opetuksessa). \n ### Voit olla yhteydessä CurreChat -palveluun liittyyvissä kysymyksissä osoitteeseen [opetusteknologia@helsinki.fi](mailto:opetusteknologia@helsinki.fi)',
      sv: '### När du använder AI-verktyg, undvik att dela data som du inte är säker på att du har rätt att dela. När du matar in data i ett AI-verktyg ska du se till att du tar hänsyn till eventuella sekretessbegränsningar och att du har fått nödvändiga upphovsrättstillstånd etc. för att dela de data som tillhandahålls. Användning av obehöriga data i AI-system kan leda till intrång i tredje parts immateriella rättigheter. \n \n ### CurreChat använder stora språkmodeller som utvecklats av OpenAI och som finns på Microsoft Azure-molntjänsten vid Helsingfors universitet i EU. De uppgifter som matas in i tjänsten kommer inte att användas för ytterligare utbildning av språkmodellen. Dessutom överförs inga användaridentifieringsdata till språkmodellen. \n \n ### Varje användare har tillgång till 75 000 tokens för språkmodellen GPT-4. Detta saldo återställs varje månad. För att minska förbrukningen av tokens bör du rensa konversationen med CLEAR-knappen varje gång du byter ämne för konversationen. \n \n ### Du kan se förbrukningen av tokens och den språkmodell som används längst ner i konversationsfönstret. \n ### Du kan läsa mer om de tokens som används av de viktigaste språkmodellerna här: [https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them). \n \n ### Mer information om användningen av AI inom utbildning finns på: [https://teaching.helsinki.fi/instruktioner/artikel/artificiell-intelligens-i-undervisningen](https://teaching.helsinki.fi/instruktioner/artikel/artificiell-intelligens-i-undervisningen).',
      en: '### When using AI tools avoid sharing any information, if you have not made sure you are allowed to share it. That is, when you are entering prompts to an AI tool, make sure that you consider any possible confidentiality restrictions and that you have acquired the necessary copyright permits, licenses etc. for sharing the entered information. Any unauthorized use of information within AI systems may lead to infringement of third-party IP rights. \n \n ### CurreChat utilizes large language models developed by OpenAI, which are located in the Microsoft Azure cloud service of the University of Helsinki within the EU region. The information input into the service is not used to further train the language model. Additionally, no user identification information is passed on to the language model. \n \n ### Each user has 75,000 tokens available for the GPT-4o language model. This balance resets every month. To reduce token consumption, it is advisable to clear the conversation using the CLEAR button whenever you change the topic of conversation. \n \n ### You can see the token consumption and the language model in use underneath the conversation window. \n ### You can learn more about tokens used by large language models here: [https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them). \n \n ### You can find more information about the use of artificial intelligence in teaching at: [https://teaching.helsinki.fi/instructions/article/artificial-intelligence-teaching](https://teaching.helsinki.fi/instructions/article/artificial-intelligence-teaching). \n ### Please contact [opetusteknologiapalvelut@helsinki.fi](mailto:opetusteknologiapalvelut@helsinki.fi) with any questions regarding CurreChat.',
    },
  },
  {
    name: 'systemMessage',
    text: {
      fi: 'Alusta keskustelu antamalla yleistason ohjeita tekoälylle',
      sv: 'Initialize the conversation by giving high level instructions to the AI',
      en: 'Initialize the conversation by giving high level instructions to the AI',
    },
  },
]

const seedInfoTexts = async () => {
  const operations: any[] = []
  infoTexts.forEach((infoText) => {
    const operation = InfoText.upsert({
      ...infoText,
    })

    operations.push(operation)
  })

  await Promise.all(operations)
}

export default seedInfoTexts
