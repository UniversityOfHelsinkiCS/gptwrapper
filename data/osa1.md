---
layout: page
title: 'Osa 1'
title_long: 'Ohjelmistotuotanto, ketteryys, Scrum'
inheader: yes
permalink: /osa1/
---

<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/3.0/">
  <img alt="Creative Commons -lisenssi" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-sa/3.0/88x31.png"
  />
</a>

Ensimmäisessä osassa käydään aluksi katsaus _ohjelmistotuotantoon_, sen historiaan ja osa-alueisiin. Tämän jälkeen tutustutaan ensin ns. vesiputousmalliin, eli aiemmin suosittuun tapaan hallita ohjelmistoprojekteja ja sen jälkeen ketteriin menetelmiin, eli nykyään vallalla olevaan ohjelmistoprojektien kehitys- ja hallintatapaan.

Tämän osan jälkipuolisko keskittyy suosituimpaan ketterään menetelmään _Scrumiin_, joka antaa erään konkreettisen ohjeiston sille miten ketteriä ohjelmistoprojekteja voi hallita.

Olethan jo lukenut [osan 0](/osa0), missä käydään tarkemmin läpi kurssin järjestelyt ja arvosteluperiaatteet?

## Typoja materiaalissa

{% include typo_instructions.md path="/osa1.md" %}

{% include norppa.md %}

## Ohjelmistotuotanto ja sen osa-alueet

IEEE (Institute of Electrical and Electronics Engineers), yksi alamme keskeisistä vaikuttajajärjestöistä, määrittelee ohjelmistotuotannon (engl. software engineering) seuraavasti:

> The application of a systematic, disciplined, quantifiable approach to the development, operation, and maintenance of software; that is, the application of engineering to software

IEEE:n mukaan ohjelmistotuotannolla tarkoitetaan systemaattista, kurinalaista, mitattavissa olevaa tapaa ohjelmistojen kehittämiseen, operointiin ja ylläpitoon. Määritelmän loppukaneetti sanoo, että kyseessä on "insinöörimäinen" tapa ohjelmistojen kehittämiseen.

Lähde määritelmälle on [SWEBOK](https://www.computer.org/education/bodies-of-knowledge/software-engineering), eli _Software Engineering Body of Knowledge_, missä IEEE on komiteavetoisesti määritellyt sen, mitä se tarkoittaa ohjelmistotuotannolla ja mitä osa-alueita se katsoo ohjelmistotuotantoon kuuluvan. SWEBOK:in uusin versio 3.0 on vuodelta 2014 eli jo jossain määrin ikääntynyt.

> Sivuhuomio: termi ohjelmistotuotanto on englanniksi _software engineering_. Suomenkielinen vastine _ohjelmistotuotanto_ onkin terminä aika huono. Jos suomenkielinen termi käännettäisiin takaisin englantiin, olisi tuloksena _software production_, eli ohjelmien valmistaminen. Termiä production käytetään yleensä suoraviivaisesta tuotteiden rakentamisesta, esim. jos tehdas valmistaa tuoleja, voidaan sanoa että sen ala on _chair production_. Ohjelmistojen tekeminen on aktiviteettina hyvin eri henkinen kuin esim. tuolin. Ohjelmistojen "rakentamisesta" käytetään englanninkielistä termiä development, eli voidaan sanoa että _company develops software for accounting_, joka taas suomeksi kuuluisi _yritys kehittää ohjelmistoja laskutukseen_. Kehittäminen (development) on aktiviteetti, joka sisältää muutakin kuin pelkkää suoraviivaista valmistamista (production), kehittäminen sisältää mm. suunnittelun ja kysymyksenasettelun sen suhteen mitä ja miksi ylipäätään on tarve jonkinlaiselle tuotteelle. Ohjelmistotuotanto eli software engineering tarkoittaakin "insinöörimäisen" lähestymistavan soveltamista ohjelmistokehitykseen.

### Ohjelmistotuotannon osa-alueet

SWEBOK:in mukaan ohjelmistotuotanto jakautuu seuraaviin osa-alueisiin:

- Software requirements
- Software design
- Software construction
- Software testing
- Software maintenance
- Software configuration management
- Software engineering management
- Software engineering process
- Software engineering models and methods
- Software quality

_Software requirements_ tarkoittaa ohjelmistolle asetettuja vaatimuksia, eli sitä miten rakennettavan ohjelmiston tulisi loppukäyttäjän tai tilaajan mielestä toimia.

_Software design_ taas tarkoittaa halutun kaltaisen toiminnallisuuden omaavan ohjelmiston sisäisen rakenteen suunnittelua.

_Software construction_ viittaa aktiviteetteihin, joiden avulla suunniteltu ohjelmisto saadaan toimivaksi tuotteeksi eli käytännössä ohjelmointia ja debuggausta.

Kuten arvata saattaa, _software testing_ tarkoittaa niitä menetelmiä, joilla varmistutaan siitä, että ohjelmisto toimii kuten halutaan ja että se on riittävän bugiton käytettäväksi.

Suurin osa ohjelmistoista ei valmistu lopullisesti koskaan. Kun ensimmäinen versio otetaan käyttöön, alkaa ylläpito, _software maintenance_ eli bugeja korjaillaan ja ohjelmistoa laajennetaan uusilla toiminnoilla.

_Software configuration management_ viittaa ohjelmiston käyttöönsaattamiseen liittyviin kirjastojen, laitteistojen ja käännösprosessin konfigurointiin sekä ohjelmiston versiointiin.

Ohjelmistojen tekemiseen liittyy paljon suunnittelua, koordinointia, hallinnointia ja raportointia eli "managementtiä", tähän viittaa _software engineering management_.

_Software engineering process_ eli ohjelmistotuotantoprosessi kuvaa tapoja tai menetelmiä miten ohjelmistoa kehittävien ihmisten tulisi hoitaa ja ajoittaa eri aktiviteettejä (requirements, design, construction, testing), joita ohjelmiston kehittäminen edellyttää. Palaamme aiheeseen tarkemmin seuraavassa luvussa.

_Software engineering models and methods_ kuvaa yksityiskohtaisempia menetelmiä, joita ohjelmistokehityksessä käytetään, kuten mallinnusta ja erilaisia suunnittelumenetelmiä.

Ohjelmistojen laatu eli _software quality_ on vielä testaustakin avarampi näkemys siihen onko ohjelmisto hyvä. Bugittomuutta ja oikein toimimista keskeisempi kysymys onkin se, sopiiko ohjelmisto ylipäätään käyttäjien tarpeeseen, eli onko se sopiva käyttötarkoitukseensa.

Ohjelmistotuotanto pitää siis sisällään suuren määrän hyvin erilaisiakin asioita. Tällä kurssilla käydään ainakin jossain määrin läpi näitä kaikkia osa-alueita. Koska aihepiirien määrä on todella suuri ja aikaa rajallisesti, jää asioiden läpikäynti osin valitettavan pintapuoliseksi. Lähes jokaisesta aihepiiristä on kuitenkin tarjolla syventäviä kursseja maisteriopinnoissa.

Aloittelevalle ohjelmistoalan opiskelijalle on tässä vaiheessa olennaisinta saada kokonaiskuva koko ohjelmistotuotannon kentästä ja sen jälkeen soveltaa sekä reflektoida oppimaansa "teoriaa" käytännön ohjelmistotyössä, esim. Tietojenkäsittelytieteen osaston opintojaksolla [ohjelmistotuotantoprojekti](https://github.com/HY-TKTL/TKT20007-Ohjelmistotuotantoprojekti) tai oikeassa työelämässä. Aihepiiriä syventävät kurssit ovat todennäköisesti huomattavasti antoisampia kokemuksia siinä vaiheessa kun opiskelija omaa jo jonkin verran käytännön työkokemusta alalta.

## Ohjelmiston vaiheet ja elinkaari

Edellisessä luvussa mainittujen ohjelmistotuotannon osa-alueiden

- Software requirements, vaatimusten määrittely
- Software design, suunnittelu
- Software construction, ohjelmiston toteutus
- Software testing, testaus
- Software maintenance, ylläpito

voidaan ajatella muodostavan _vaiheet_ (engl. phases) joiden kautta ohjelmisto kehityksensä aikana etenee. Joskus näistä vaiheista käytetään nimitystä ohjelmiston _elinkaari_ (engl. software lifecycle). Aikojen saatossa on ollut erilaisia tapoja jäsentää ohjelmistojen kehittäminen elinkaaren suhteen, eli se miten ja kenen toimesta vaiheet on suoritettu, on vaihdellut.

### Code'n'fix

Tietokoneiden historian alkuaikoina laitteet maksoivat paljon, ohjelmistot olivat laitteistoihin nähden "triviaaleja". Ohjelmointi tapahtui alussa kaapeleita yhdistelemällä ja hieman myöhemmin konekielellä. Sovellusten käyttäjät, kuten ammusten lentoratoja laskeneet fyysikot, yleensä ohjelmoivat itse tarvitsemansa sovellukset.

Sovelluskehitys tapahtui pitkälti _code and fix_ -mentaliteetilla, eli koodattiin ja katsottiin toimiko softa. Ohjelmistojen yksinkertaisuuden ja suhteellisen halpuuden takia se ei muodostanut minkäänlaista pullonkaulaa työskentelylle vaan päinvastoin helpotti työskentelyä kun laskutoimitukset voitiin tehdä tietokoneella käsin laskemisen sijaan.

Vähitellen ohjelmistot alkoivat kasvaa. Kehitettiin korkeamman tason ohjelmointikieliä kuten Fortran, Cobol, Algol ja ohjelmistojen käyttöalue alkoi laajeta muuallekin kuin sotateollisuuteen. Ohjelmistoja alettiin tekemään loppukäyttäjille, jotka eivät enää olleet ohjelmistoalan ammattilaisia, eli kuilu ohjelmiston tekijöiden ja loppukäyttäjien välillä alkoi kasvaa.

Ohjelmistoala alkoi joutua ongelmiin, [wikipedian](https://en.wikipedia.org/wiki/Software_crisis) mukaan ongelmaksi alkoivat muodostua mm. seuraavat seikat

- budjetit ylittyivät ja projektit myöhästyivät aikatauluista
- ohjelmistot olivat tehottomia, niiden laatu oli huono ja ne eivät toimineet käyttäjien tarpeiden mukaan
- koodin ylläpito ja laajentaminen oli vaikeaa
- ja jopa usein kävi niin, että ohjelmistoja ei hyvistä aikeista huolimatta saatu ollenkaan toimitettua

### Ohjelmistokriisi

Kesällä 1968 NATO:n järjestämässä konferenssissa julkistettiinkin että maailmassa on _software crisis_, eli ohjelmistokriisi.

Termillä viitataan siihen että on vaikeaa toteuttaa käyttökelpoisia, oikein toimivia, tehokkaita ja laajennettavissa olevia ohjelmistoja käytössä olevien resurssien puitteissa.

Eräs tietojenkäsittelyn pioneereista, Turing-palkittu Edsger Dijkstra ilmaisi asian seuraavasti vuonna 1972 pitämässään [esitelmässä](https://www.cs.utexas.edu/~EWD/transcriptions/EWD03xx/EWD340.html)

> The major cause of the software crisis is that the machines have become several orders of magnitude more powerful! To put it quite bluntly: as long as there were no machines, programming was no problem at all; when we had a few weak computers, programming became a mild problem, and now we have gigantic computers, programming has become an equally gigantic problem.

Eli kun tietokoneita ei ollut, ohjelmointi ei muodostanut ongelmaa. Ensimmäiset tietokoneet olivat laskentateholtaan pieniä, ja ne aiheuttivat ainoastaan pieniä ongelmia ohjelmointiin. Massiivisen tehokkaiden tietokoneiden myötä myös ohjelmoinnista on tullut massiivinen ongelma...

### Ohjelmistokehitys insinööritieteenä: software engineering

Termi _software engineering_ eli ohjelmistotuotanto määriteltiin ensimmäistä kertaa 1968:

> The establishment and use of sound engineering principles in order to obtain economically software that is reliable and works efficiently on real machines

Syntyi idea siitä, että _code'n'fix_ -mentaliteetin sijaan ohjelmistojen kehittämisen tulisi olla kuin mikä tahansa muu insinöörityö, eli kuten esim. siltojen rakentamisessa, tulee rakennettava artefakti ensin määritellä (requirements) tarkasti ja suunnitella (design) aukottomasti ja tämän jälkeen rakentaminen (construction) on melko suoraviivainen vaihe.

### Vesiputous- eli lineaarinen malli

Winston Roycen vuonna 1970 julkaisema artikkeli [Management of the development of Large Software](http://www-scf.usc.edu/~csci201/lectures/Lecture11/royce1970.pdf) pohdiskelee isojen ohjelmistojen kehittämiseen liittyvää problematiikkaa. Artikkelin sivulla 2 Royce esittelee yksinkertaisen _prosessimallin_ (eli ohjeiston työvaiheiden jaksottamiseen), jossa ohjelmiston elinkaaren vaiheet suoritetaan lineaarisesti peräkkäin:

![](https://raw.githubusercontent.com/mluukkai/ohjelmistotekniikka-kevat2019/main/web/images/l-1.png)

Roycen versio kuvasta näyttää seuraavalta:

![]({{ "/images/1-1.png" | absolute_url }})

Suoraviivainen lineaarinen malli, jota ruvettiin kutsumaan vesiputousmalliksi, saavutti nopeasti suosiota. Malli on monella tapaa järkeenkäypä; ensin kannattaa selvittää mitä ollaan tekemässä ja suunnittelu hoitaa vasta tämän jälkeen. Kun suunnitelma on valmis, voidaan tuote valmistaa ja sen jälkeen testata että se toimii kuten haluttiin, näinhän toimitaan monella muullakin tuotannon alalla.

Vesiputousmallin suosion taustalla oli osittain se, että Yhdysvaltojen puolustusministeriö (Department of Defence, DoD) joka oli tuohon aikaan eräs maailman suurimmista ohjelmistojen tilaajista, rupesi vaatimaan kaikilta alihankkijoiltaan prosessin noudattamista (Standardi DoD STD 2167). Muutkin ohjelmistoja tuottaneet tahot ajattelivat, että koska DoD vaatii vesiputousmallia, on se hyvä asia ja tapa kannattaa omaksua itselleen.

Vesiputousmalli perustuu vahvasti siihen, että eri vaiheet ovat erillisten tuotantotiimien tekemiä. Joukko analyytikkoja miettii asiakkaan kanssa sovellukselle asetetut vaatimukset, ohjelmistoarkkitehdit saavat vaatimusmäärittelyn tulokset ja suunnittelevat ohjelman sen perusteella. Ohjelmoijat toteuttavat sovelluksen arkkitehtien suunnitelman mukaan ja antavat sen testaajille laadunhallintaa varten. Tämä tuntuu luonnolliselta työnjaolta, kutakin erilaista vaihetta tekee kyseessä olevaan vaiheen työskentelymenetelmiin erikoistunut ihmisjoukko.

Jotta tieto kulkee ohjelmistokehityksen eri vaiheiden välillä, tulee kunkin vaiheen tulokset dokumentoida huolellisesti. Erityisesti asiakkaan kanssa tehtävän vaatimusmäärittelyn on oltava huolellisesti tehty ja hyvin dokumentoitu, sillä kaikki myöhemmät vaiheet olettavat että vaatimukset on kattavasti ja virheettömästi kirjattu.

Vesiputousmallin mukaisesta toiminnasta käytetään joskus luonnehdintaa _Big Design Up Front_ lyhenteenä BDUF, kuvaamaan sitä faktaa, että koko ohjelmisto määritellään ja suunnitellaan tyhjentävästi ennen ohjelmointivaiheen aloittamista. Termiä BDUF käytetään yleensä negatiivisessa merkityksessä kuvaamaan vesiputousmallin raskautta.

Vesiputousmallin mukainen ohjelmistoprosessi on yleensä tarkkaan etukäteen suunniteltu, resursoitu ja aikataulutettu, tästä johtuu joskus siitä käytetty nimike _plan based process_, eli suunnitelmavetoinen prosessi.

#### Vesiputousmallin ongelmat

Vesiputousmallin mukainen ohjelmistotuotanto ei ole osoittautunut erityisen onnistuneeksi.

Vesiputousmalli olettaa, että ohjelmistotuotannon vaiheet tapahtuvat peräkkäin ja jokainen vaihe ainakin isoissa projekteissa eri ihmisten toimesta. Tästä koituu useita ongelmia.

Ongelmista keskeisin on se, että tehtiin vaatimusmäärittely miten huolellisesti tahansa, tulevat vaatimukset kuitenkin melkein varmasti muuttumaan matkan varrella. On osoittautunut, että asiakkaat eivät ohjelmistoja tilatessaan tiedä tai osaa sanoa mitä haluavat tai tarvitsevat. Asiakkaan tarpeet nimittäin saattavat muuttua projektin kuluessa. Bisnesympäristö saattaa vaihtua, tulee uusia lainsäädäntöjä, firmat fuusioituvat, maailman taloussuhdanteet vaihtuvat, tulee globaali pandemia... Mitä pidempi ohjelmiston kehitysprosessi on, sitä varmempaa on, että vaatimukset elävät.

On myös kerta toisensa jälkeen nähty, että asiakas alkaa haluta muutoksia heti kun näkee valmiin lopputuloksen. Koska ohjelmistot ovat abstrakteja tuotteita, joilla ei välttämättä ole aiempia esikuvia, on asiakkaiden hyvin vaikea pystyä etukäteen miettimään kaikkea toiminnallisuutta sillä tasolla, että se voitaisiin lyödä täysin lukkoon kuten vesiputousmalli olettaa.

Oma riskinsä on myös se, että suunnittelijat tai ohjelmoijat tulkitsevat dokumentoituja asiakkaan vaatimuksia väärin, tai että asiakas ei ole tullut ymmärretyksi täysin vaatimusten kirjaushetkellä, eli vaatimukset on jo lähtökohtaisesti dokumentoitu väärin. Oikeastaan kyseessä ei edes ole riski, vaan on jopa varmaa että ymmärrys- ja tulkintaepäselvyyksiä tapahtuu, oli dokumentaatio miten tarkkaa tahansa.

Vesiputousmallin mukaisen vaatimusmäärittelyn, suunnittelun ja toteutuksen erottaminen on käytännössä järjetöntä tai jopa mahdotonta. Valittu ohjelmiston arkkitehtuuri eli "korkean tason rakenne" ja käytössä olevat toteutusteknologiat vaikuttavat suuresti määriteltyjen ominaisuuksien hintaan, määritellessä kannattaa siis miettiä myös suunnittelua ja toteutusta, ja sitä missä muodossa asiakkaan vaatimukset on ylipäätään mahdollista toteuttaa järkevin resurssein.

Suunnittelun ja toteutuksen eriyttäminenkään ei ole osoittautunut toimivaksi ideaksi. Ohjelmistoja on mahdotonta suunnitella siten, että toteutus on suoraviivainen mekaaninen toimenpide, osa suunnittelusta tapahtuu pakosti vasta ohjelmointivaiheessa.

Vesiputousmalliin perustuvan ohjelmistotuotannon takana on siis pitkälti analogia muihin insinööritieteisiin: rakennettava artefakti tulee ensin määritellä ja suunnitella (design) aukottomasti, tämän jälkeen rakentaminen (construction) on triviaali vaihe.

> Perinteisesti ohjelmointi on rinnastettu triviaalina pidettyyn "rakentamisvaiheeseen" ja kaiken haasteen on ajateltu olevan määrittelyssä ja suunnittelussa. Tätä rinnastusta on kuitenkin ruvettu kritisoimaan, sillä ohjelmistojen suunnittelu sillä tarkkuudella, että suunnitelma voidaan muuttaa suoraviivaisesti koodiksi on osoittautunut mahdottomaksi.
>
> Onkin [esitetty](http://www.bleading-edge.com/Publications/C++Journal/Cpjour2.htm) että perinteisen insinööritiedeanalogian triviaali rakennusvaihe ei ohjelmistoprosessissa olekaan ohjelmointi, vaan ohjelmakoodin kääntäminen. Siispä ohjelmakoodi on itseasiassa ohjelmiston lopullinen suunnitelma siinä mielessä kuin insinööritieteet käsittävät suunnittelun (design).

Vesiputousmallin mukaisessa ohjelmistokehityksessä testaus suoritetaan kun ohjelmisto on valmiina. Vasta lopussa tapahtuva laadunhallinta paljastaa ongelmat kuitenkin aivan liian myöhään. Vikojen korjaaminen saattaa tulla hyvinkin kalliiksi, sillä testaus voi tuoda esiin ongelmia, jotka pakottavat muuttamaan radikaalilla tavalla ohjelmiston rakennetta tai jopa sen vaatimuksia.

Jos haluat lukea lisää vesiputousmallin ongelmista, kannattaa tutustua Martin Fowlerin artikkeliin [The New Methodology](http://martinfowler.com/articles/newMethodology.html).

#### Royce ja vesiputousmalli

Paradoksaalista kyllä vesiputousmallin isänä pidetty Royce _ei suosittele_ artikkelissaan suoraviivaisen lineaarisen mallin käyttöä. Royce kyllä esittelee lineaarisen vesiputousmallin artikkelin sivulla 2, mutta toteaa että se _ei sovellu_ monimutkaisten ohjelmistoprojektien tekotavaksi.

Roycen mukaan sovelluksesta tulee ensin tehdä prototyyppi ja vasta siitä saatujen kokemusten valossa kannattaa suunnitella ja toteuttaa lopullinen ohjelmisto. Royce esitteleekin artikkelin loppupuolella mallin, missä ohjelmisto tehdään kahdessa iteraatiossa, kuva Roycen artikkelista

![]({{ "/images/1-3.png" | absolute_url }})

Vesiputousmalli tai ainakin Roycen nimeäminen vesiputousmallin isäksi on siis suuri väärinymmärrys. Onneksi Roycen artikkeli on nykyään helposti saatavilla internetissä ja kaikki voivat käydä itse tarkistamassa mitä Royce on vesiputousmallista sanonut.

### Iteratiivinen ja inkrementaalinen ohjelmistokehitys

Lineaarisen mallin ongelmiin reagoinut _iteratiivinen_ tapa tehdä ohjelmistoja alkoi yleistyä 90-luvulla (mm. spiraalimalli, prototyyppimalli, Rational Unified process).

Iteratiivisessa mallissa ohjelmistotuotanto jaetaan pienempiin aikaväleihin, eli _iteraatioihin_. Toisin kuin vesiputousmallin mukaisessa ohjelmistotuotannossa, iteratiivisesti edetessä ei pyritä tekemään heti alussa kattavaa määrittelyä ja suunnittelua.

Jokaisen iteraation aikana määritellään, suunnitellaan, toteutetaan sekä testataan osa ohjelmistoa, eli ohjelmisto kehittyy vähitellen. Ohjelma valmistuu siis pala palalta, tämän takia iteratiivisten menetelmien sanotaan olevan myös _inkrementaalisia_.

Asiakasta tavataan jokaisen iteraation välissä, asiakas näkee sen hetkisen version ohjelmasta ja pystyy vaikuttamaan seuraavien iteraatioiden kulkuun. Ohjelmiston inkrementaalisen kasvamisen takia sen perusversio on mahdollista saada loppukäyttäjien käyttöönkin vielä kehitystyön ollessa käynnissä.

Seuraava kuva havainnollistaa sitä, että iteratiivisessa mallissa kaikkia ohjelmistoprosessin vaiheita suoritetaan jokaisessa iteraatiossa. Määrittelyllä ja suunnittelulla on alussa suurempi painoarvo, mutta ohjelmiston toteutus ja testaus alkaa jo ensimmäisten iteraatioiden aikana.

![]({{ "/images/1-4.png" | absolute_url }})

Vesiputousmallin "isä" Royce suositteli siis jo vuonna 1970 juurikin iteratiivista tapaa (kahden iteraation versiota) monimutkaisten ohjelmistojen kehitysmalliksi. Roycen ehdottama menetelmä ei oikeastaan ollut inkrementaalinen, sillä ensimmäisen iteraation aikana rakennettiin ainoastaan prototyyppi, jonka pohjalta varsinainen sovellus määriteltiin, suunniteltiin ja toteutettiin.

Yhdysvaltojen puolustusministeriön vuonna 2000 julkaisema standardi (MIL-STD-498) alkoi suosittelemaan iteratiivista ohjelmistoprosessia:

> There are two approaches, evolutionary (iterative) and single step (waterfall), to full capability. An evolutionary approach is preferred. ... In this approach, the ultimate capability delivered to the user is divided into two or more blocks, with increasing increments of capability...software development shall follow an iterative spiral development process in which continually expanding software versions are based on learning from earlier development. It can also be done in phases

Itseasiassa iteratiivinen ohjelmistokehitys on paljon vanhempi idea kuin vesiputousmalli. Esimerkiksi NASA:n ensimmäisen amerikkalaisen avaruuteen vieneen Project Mercuryn ohjelmisto kehitettiin 50-luvun lopussa iteratiivisesti. Avaruussukkuloiden ohjelmisto tehtiin vesiputousmallin valtakaudella 70-luvun lopussa, mutta sekin kehitettiin lopulta iteratiivista prosessia käyttäen 8 viikon iteraatioissa, 31 kuukauden aikana. Lisää aiheesta Larmanin ja Basilin erinomaisessa artikkelissa [incremental and iterative development, a brief history](http://www.craiglarman.com/wiki/downloads/misc/history-of-iterative-larman-and-basili-ieee-computer.pdf).

### Ketterä ohjelmistokehitys

1980- ja 1990-luvun prosessimalleissa korostettiin huolellista projektisuunnittelua, formaalia laadunvalvontaa, yksityiskohtaisia analyysi- ja suunnittelumenetelmiä ja täsmällistä, tarkasti ohjattua ohjelmistoprosessia. Prosessimallit tukivat erityisesti laajojen, pitkäikäisten ohjelmistojen kehitystyötä, mutta pienten ja keskisuurten ohjelmistojen tekoon ne osoittautuivat usein turhan jäykiksi.

Perinteisissä prosessimalleissa (myös iteratiivisissa) on pyritty työtä tekevän yksilön merkityksen minimoimiseen. Ajatuksena on ollut että yksilö on "tehdastyöläinen", joka voidaan helposti korvata toisella ja tällä ei ole ohjelmistoprosessin etenemiselle mitään vaikutusta.

Ristiriidan seurauksena syntyi joukko ketteriä menetelmiä (engl. agile methods), jotka korostivat itse ohjelmistoa sekä ohjelmiston asiakkaan ja toteuttajien merkitystä yksityiskohtaisen suunnittelun ja dokumentaation sijaan.

### Ketterä manifesti

17 ketterien menetelmien pioneeria kerääntyi helmikuussa 2001 kokoukseen, jonka tuloksena oli [ketterä manifesti](http://agilemanifesto.org/), eli näkemys siitä, mitä ketterällä ohjelmistokehityksellä tarkoitetaan.

Manifesti on käännetty monelle kielelle, myös [suomeksi](https://agilemanifesto.org/iso/fi/manifesto.html), mutta tarkastellaan sen englanninkielistä versiota:

We are uncovering better ways of developing software by doing it and helping others do it. Through this work we have come to value:

- _Individuals and interactions_ over processes and tools
- _Working software_ over comprehensive documentation
- _Customer collaboration_ over contract negotiation
- _Responding to change_ over following a plan

That is, while there is value in the items on the right, we value the items on the left more.

Manifesti siis koostuu neljästä vastakkainasettelun sisältävästä kohdasta, jotka ilmaisevat mikä on ketterien menetelmien näkemyksen mukaan oleellisinta ohjelmistokehityksessä. Ensimmäinen kohta sanoo, että erilaiset työkalut ja prosessit voivat olla tärkeää, mutta _vielä tärkeämpää_ ovat ohjelmiston kehittäjät, käyttäjät, tilaajat ja heidän välinen interaktio. Toinen kohta taas ei kiellä dokumentaation tärkeyttä, mutta sanoo että lopulta tärkeintä on toimiva ohjelmisto. Ketterä manifesti ei siis kiellä tai pidä arvottomana "vanhan maailman" tärkeänä pitämiä asioita kuten _suunnitelman noudattamista_, mutta osoittaa, että niitäkin oleellisimpia seikkoja on, kuten _muutokseen reagoiminen_.

Manifestin [laatijoiden joukko](https://agilemanifesto.org/authors.html) koostuu monesta tutusta ja vaikutusvaltaisesta nimestä, kuten Kent Beck, Robert Martin, Ken Schwaber, Martin Fowler ja Alistair Coburn, jotka ovat vaikuttaneet merkittävästi nykyiseen vallitsevaan ohjelmistokehityksen tapaan.

### Ketterät periaatteet

Manifesti sisältää yllä olevan lisäksi 12 hieman konkreettisempaa toiminnan ohjeistusta antavaa ketterää periaatetta. Käydään periaatteet nyt läpi ja pohditaan myös niiden taustalla olevia ajatuksia.

Aloitetaan kolmesta periaatteesta.

> Our highest priority is to satisfy the customer through early and continuous delivery of valuable software.

> Deliver working software frequently, from a couple of weeks to a couple of months, with a preference to the shorter timescale.

> Working software is the primary measure of progress.

Oleellisinta kaikesta ja mittarina projektin edistymiselle on toimintakelpoisen, arvoa tuottavan ohjelmiston toimittaminen asiakkaalle. Toisin kuin vesiputousmallissa, aloitetaan valmiin toiminnallisuuden toimittaminen jo aikaisessa vaiheessa ja sitä tehdään toistuvasti tiheähkösti iteroiden. Manifesti puhuu _from couple of weeks to couple of months_, nykyään ideaali on vieläkin tiheämpi toimitusväli, jopa joka päivä tapahtuva useiden sovelluksen versioiden julkaisu.

> Business people and developers must work together daily throughout the project.

> The most efficient and effective method of conveying information to and within a development team is face-to-face conversation.

> Welcome changing requirements, even late in development. Agile processes harness change for the customer's competitive advantage.

Vesiputousmallissa fundamentaalina periaatteena oli se, että ohjelmiston valmistaminen alkaa kattavalla vaatimusmäärittelyllä, jonka aikana asiakkaan vaatimukset selvitetään, dokumentoidaan huolellisesti ja "jäädytetään", eli vaatimuksiin ei sen koommin edes sallita muutoksia. Asiakas on seuraavan kerran mukana kehitystyössä ehkä vasta lopussa tekemässä hyväksymistestausta.

Ketterän manifestin periaatteet ovat täysin päinvastaiset. Asiakkaiden ja sovelluskehittäjien oletetaan toimivan koko ohjelmiston kehityskaaren tiiviissä, jopa päivittäisessä yhteistyössä. Kommunikointi pyritään hoitamaan raskaan dokumentaation sijaan kevyemmin, jopa keskustellen. Myös suhtautuminen vaatimusmäärittelyyn on mennyt päälaelleen. Asiakas saa vaihtaa vaatimuksiaan kesken ohjelmistokehityksen, ja siihen jopa rohkaistaan, jos asiakas pystyy muuttamalla vaatimusmäärittelyä saamaan itselleen etua aikaan.

> Build projects around motivated individuals. Give them the environment and support they need, and trust them to get the job done.

> The best architectures, requirements, and designs emerge from self-organizing teams.

Ketterät periaatteet luottavat siihen, että kun ohjelmistokehittäjille annetaan sopiva työskentely-ympäristö, he tekevät parhaansa toimittaakseen asiakkaalle arvokkaan sovelluksen ilman tarvetta ulkoiselle kontrolloinnille. Ei ole tarvetta myöskään erillisille vaatimuksia keräävän analyytikon tai suunnittelusta huolehtivan ohjelmistoarkkitehdin rooleille, softatiimit osaavat toimia parhaiten itseorganisoitumalla, eli päättämällä itse toimintamenetelmistään.

> At regular intervals, the team reflects on how to become more effective, then tunes and adjusts its behavior accordingly.

Aiemmin mainittu periaate _Welcome changing requirements..._ siis kuvailee, että ketterä mahdollistaa ja suorastaan kannustaa tuotteen kehityssuunnan muuttamisen uusien tarpeiden ilmetessä. Vastaavasti kehitystiimin odotetaan tarkastelevan omaa toimintaansa ja muokkaavan sitä jatkuvasti parempaan suuntaan.

> Simplicity – the art of maximizing the amount of work not done – is essential.

Vesiputousmalli ja muut vanhemmat kehitysmenetelmät antoivat suuren painoarvon dokumentaatiolle ja erilaisille "prosessin määräämille" raporteille, joihin käytettiin paljon aikaa ja vaivaa, ilman että ne olisivat kuitenkaan kovin paljoa edistäneet itse tuotteen valmistumista. Ketterissä menetelmissä ideana on eliminoida mahdollisimman pitkälle kaikki mikä ei ole primääristen tavoitteiden kannalta oleellista (_Working software is the primary measure of progress_). Myös ohjelmistokehittäjillä on pyrkimys rakentaa ohjelmistoon tulevaisuuden varalta kaikenlaista ekstraa, myös tälläiseen tulisi ketterässä hengessä suhtautua kriittisesti.

Viimeiset kaksi periaatetta ovat ne, jotka tahtovat useimmiten unohtua:

> Continuous attention to technical excellence and good design enhances agility.

> Agile processes promote sustainable development. The sponsors, developers, and users should be able to maintain a constant pace indefinitely.

Ketteryys edellyttää että tiimi pystyy muuttamaan tarvittaessa sovelluskehityksen suuntaa uusien tarpeiden noustessa esiin. Tämä taas edellyttää, että tiimin on ylläpidettävä ohjelmiston laatua riittävällä tasolla, jos nimittäin sovellus on sisäiseltä rakenteeltaan huono purkkaviritys, on siitä koko ajan vaikeampi laajentaa uusilla toiminnallisuuksilla, erityisesti sellaisilla, joiden tarvetta ei aiemmin ehkä osattu ennakoida. Eli jos laatuun ei kiinnitetä riittävää huomiota, ketteryys menetetään, ja sovelluksen kehitys muuttuu erittäin hitaaksi.

Tyypillisesti ohjelmistoprojekteihin saatetaan suhtautua deadlinevetoisesti, eli lähellä deadlinea siirrytään paniikinomaiseen ylityömoodiin, jotta toimiva tuote saadaan puristettua kasaan. Tämän jälkeen hengähdetään, mutta pian edessä on taas seuraava tärkeä deadline ja kun vuodet kuluvat loppuunpalamisenkin riski alkaa kasvaa. Kaikesta tästä on usein seurauksena myös huonolaatuista koodia, joka on päivä päivältä hankalammin muokattavaa.

Manifesti kuitenkin muistuttaa, että tällainen oravanpyörä ei ole välttämätön, ja suosittelee että sovellusta kehitettäisiin sellaisella nopeudella, joka on mahdollista ylläpitää vaikkapa ikuisesti.

### Ketterät menetelmät ja Lean

Ketterät menetelmät on sateenvarjotermi useille eri menetelmille. 2000-luvun alkupuolella [Extreme programming](http://www.extremeprogramming.org/) eli XP oli ketteristä menetelmistä suosituin. Nykyään hyvin harva soveltaa "oppikirjamaista" XP:tä, mutta sen käytänteistä moni on jäänyt elämään ja omaksuttu monien softatiimien työkalupakkiin. Tutustumme moniin XP:n käytänteisiin kurssin aikana.

XP:ltä valta-aseman otti pikkuhiljaa [Scrum](https://www.scrum.org/), joka lienee tällä hetkellä maailman eniten käytetty ohjelmistokehitysmenetelmä. Tutustumme Scrumiin tarkemmin seuraavassa luvussa.

Ketterä ohjelmistotuotanto on ottanut runsaasti vaikutteita [Toyota production systemin](https://global.toyota/en/company/vision-and-philosophy/production-system/) taustalla olevasta _lean_-ajattelusta. Viime vuosina termi lean on alkanut näkyä yhä tiiviimmin termin agile rinnalla tai tilalla ohjelmistokehityksestä puhuttaessa. Leanista peräisin olevaa [kanbania](https://fi.wikipedia.org/wiki/Kanban) on ruvettu soveltamaan runsaasti ohjelmistokehitykseen, usein se täydentää jotain ketterää menetelmää kuten Scrumia. Kanbanin ja Scrumin yhdistelmä kulkeekin nimellä [Scrumban](https://www.amazon.com/exec/obidos/ASIN/0321150783/poppendieckco-20). Palaamme Leaniin tarkemmin kurssin [osassa 5](/osa5#lean).

Ketterät menetelmät on alun perin suunniteltu yksittäisen, pienehköjen ohjelmistotiimien hallintaan. Viime aikoina ketterille menetelmille on hahmoteltu useitakin laajennuksia mm. [SaFe](https://www.scaledagileframework.com/) ja [LeSS](https://less.works/), joiden avulla on mahdollista hallinnoida useista ohjelmistotiimeistä koostuvia kokonaisuuksia. Ketterien periaatteiden lisäksi nämä laajemman skaalan kehitysmenetelmän nojaavat voimakkaasti leanin tarjoamiin periaatteisiin. Palaamme asiaan kurssin [viidennessä osassa](/osa5#laajan-skaalan-ketterä-ohjelmistokehitys).

## Scrum

Tutustumme nyt ketteristä menetelmistä eniten käytettyyn, eli [Scrumiin](https://www.scrum.org/). Tarkastellaan ensin muutamaa perustavanlaatuista Scrumin ja muidenkin ketterien menetelmien taustalla olevaa perusolettamusta.

### Vesiputousmallin ongelmia

Edellisestä luvusta kertauksena voidaan kiteyttää vesiputousmallin suurimmat ongelmat:

- Useimmiten on mahdotonta määritellä ohjelmiston vaatimukset tyhjentävästi projektin alkuvaiheessa. Asiakas ei yleensä ymmärrä vielä alussa mitä haluaa ja bisnesympäristö muuttuu projektin kuluessa.
- Suunnittelu sillä tasolla, että ohjelmointi on triviaali ja ennustettava rakennusvaihe, rinnastettavissa esim. talon rakennukseen, on mahdotonta.
- Ohjelmointi on osa suunnitteluprosessia, ohjelmakoodi on tuotteen lopullinen suunnitelma. Suunnittelu taas on teknisesti haastavaa, riskejä sisältävää toimintaa.

90-luvulla kehitellyt iteratiiviset prosessimallit korjaavat monia näistä epäkohdista, mutta ne kuitenkin ovat vielä vahvasti suunnitelmavetoisia (engl. plan based) ja olettavat että ohjelmistotuotanto on jossain määrin _kontrolloitavissa oleva prosessi_.

Keskiössä on siis tarkka projektisuunnitelma (joka toki iteratiivisissa malleissa voi elää) ja sen noudattaminen, sekä selkeä roolijako: projektipäälliköt, analyytikot, arkkitehdit, ohjelmoijat, testaajat muodostavat kukin omiin vastuualueisiin liittyvät tiiminsä.

### Ketterien menetelmien perusolettamuksia

Useimmat ohjelmistoprojektit ovat laadultaan uniikkeja. Vaatimukset ovat erilaiset kuin millään jo tehdyllä ohjelmistolla. Tekijät vaihtuvat usein, kukin tiimi on omanlaisilla kompetensseilla ja persoonallisuuksilla varustettu. Myös toteutusteknologiat kehittyvät koko ajan, joten uusia projekteja tehdään todennäköisesti tavalla, joka ei ole kaikille ohjelmistokehittäjille ennestään tuttu.

Näiden seikkojen takia ketterien menetelmien mukaan järkevää onkin lähteä oletuksesta että kyseessä ei ole kontrolloitu prosessi, joka voidaan tarkkaan etukäteen suunnitella. Parempi onkin ajatella ohjelmiston kehittäminen tuotekehitysprojektina, joka sisältää runsaasti epävarmuutta ja tuntemattomia seikkoja. Tällaisten projektien hallinnointiin sopii tarkkaan etukäteissuunnitelmaan perustuvan lähestymistavan sijaan _empiirinen prosessi_.

Empiirisessä prosessissa taustalla olevina periaatteina on _läpinäkyvyys_ (transparency), _tarkkailu_ (inspection) ja _mukauttaminen_ (adaptation). On oleellista, että koko tiimi on mahdollisimman hyvin selvillä siitä mitä tapahtuu ja mistä puhutaan, esim. mitä tarkoitetaan kun jonkin asian sanotaan olevan valmiina. Projektiin liittyvien asioiden suhteen tulee siis vallita suuri läpinäkyvyys (transparency), joka taas mahdollistaa asioiden tilan jatkuvan tarkkailun (inspection), eli onko tuotteen kehitys menossa sinne suuntaan, mikä on asiakkaan nykyisen näkemyksen mukainen ja tukevatko tiimin käytänteet optimaalisella tavalla sovelluksen kehitystä. Jos ja _kun_ asioissa havaitaan parannuksen varaa, mukautetaan (adaptation) tuotteen kehityssuuntaa tai tiimin toiminnan periaatteita.

Ketterien menetelmien oletuksena on, että perinteinen command-and-control tyylinen hallinnointi ja ihmisten sekä tiimien jakaminen eri vastuualueisiin (suunnittelija, ohjelmoija, testaaja, frontend, backend) ei tuota optimaalista tulosta.

Sen sijaan vahvana on oletus, että ihmiset toimivat parhaiten itseorganisoituvissa tiimeissä, jossa tiimille annetaan työskentelyrauha ja uskotaan tiimin omaan kykyyn ottaa vastuu toiminnastaan. Itseorganisoituva tiimi toimii kollektiivina, kantaen yhteisen vastuun tekemisistään, eli tiimi onnistuu ja epäonnistuu yhdessä.

### Scrumin taustaa

Tutustutaan nyt Scrumiin, joka on tällä hetkellä selvästi suosituin ketterä menetelmä/prosessimalli.

Termi Scrum ja osa sen taustalla olevista periaatteista löytyvät ensimmäistä kertaa 1986 julkaistusta artikkelista [The new new product development game](http://www.agilepractice.eu/wp-content/uploads/2016/09/Product-Development-Scrum-1986.pdf), missä japanilaiset professorit Takeuchi ja Nonaka kuvailevat mitä yhteisiä toimintaperiaatteita joukolla menestyneitä yrityksiä (mm. Fuji-Xerox, Canon, Honda, NEC, Epson, Brother, 3M, Xerox, Hewlett-Packard) on.

Tänä päivänä tuntemamme alun perin ohjelmistokehitykseen suunnatun Scrumin kehittivät Ken Schwaber ja Jeff Sutherland 1990-luvun puolivälissä. Scrumin perussisällön määrittelee [The Scrum guide](https://scrumguides.org/), vajaa 20 sivua pitkä dokumentti, joka päivittyy säännöllisin väliajoin. Edellinen versio on vuodelta 2020.

Kehittäjiensä sanoin

> Scrum is a framework within which people can address complex adaptive problems, while productively and creatively delivering products of the highest possible value

Scrumin kehittäjät mainitsevat että kyseessä on framework, eli _menetelmäkehys_, jonka avulla monimutkaisten tuotteiden kehitystä voidaan hallita siten, että asiakkaalle saadaan tuotteista maksimaalinen arvo. Scrumin kehittäjät korostavat, että kyseessä ei ole prosessi (process) tai menetelmä/tekniikka (technique), joka yksistään antaisi riittävän ohjeiston työskentelylle, kyseessä on siis menetelmäkehys, joka antaa kehityksen suuntaviivat mutta mahdollistaa ja oikeastaan edellyttääkin muitakin menetelmiä ja tekniikoita, jotka kukin tulee valita tapauskohtaisesti.

Scrumin tärkein tavoite on tehdä käytettyjen työskentelymenetelmien suorituskyky näkyväksi ja mahdollistaa näin ollen tuotteen sekä työskentely-ympäristön jatkuva parantaminen, eli edellä mainittu kolmikko _transparency, inspection_ ja _adaptation_, läpinäkyvyys, tarkkailu ja mukautuminen on Scrumin keskiössä.

Kehittäjiensä mukaan Scrum on

- _Lightweight_
- _Simple to understand_
- _Extremely difficult to master_

Näin todellakin on, toisin kuin jotkin muut ohjelmistokehitysmallit (kuten vuosituhannen vaihteessa suosittu [Rational Unified Process](https://en.wikipedia.org/wiki/Rational_Unified_Process) tai viime vuosina suosioon noussut [SaFe](https://www.scaledagileframework.com/)), Scrum sisältää ainoastaan muutaman "säännön", joiden määritelmän sisältävän Scrum Guiden lukee puolessa tunnissa. Kaikki vaikuttaa selkeältä ja yksinkertaiselta, mutta todellisuus on usein toinen. Toimiakseen tehokkaasti Scrum vaatii syvällistä perehtymistä ja vuosien kokemusta, pelkkä sääntöjen mekaaninen seuraaminen ei riitä.

### Scrum lyhyesti

Scrum on iteratiivinen ja inkrementaalinen menetelmä tai kehittäjiensä mukaan menetelmäkehys (framework), missä ohjelmistokehitys tapahtuu 1-4 viikon iteraatioissa, joita Scrumissa kutsutaan _sprinteiksi_.

Kehityksestä vastaa _Scrum-tiimi_, joka koostuu 3-9:stä kehittäjästä. _Scrum master_ toimii tiimin apuna ohjaten mm. prosessin noudattamisessa ja parantamisessa sekä toimien rajapintana muihin sidosryhmiin. _Product owner_ eli tuotteen omistaja hallinnoi projektin _backlogia_, joka sisältää priorisoidussa järjestyksessä projektissa toteutettavalle ohjelmistolle asetetut vaatimukset.

Jokaisen sprintin alussa tiimi valitsee projektin backlogista sprintin aikana toteutettavat vaatimukset, eli ne toiminnallisuudet, jotka sprintin aikana on tarkoitus toteuttaa. Sprintin aikana Scrum-tiimi toteuttaa itseorganisoidusti sprintiin valitut vaatimukset lopputuloksena vaatimusten osalta toimiva ohjelmisto.

![]({{ "/images/2-1.png" | absolute_url }})

### Scrum: roolit, artefaktit ja eventit

Käydään vielä läpi hieman seikkaperäisemmin Scrumin terminologiaa ennen kun mennään tarkempiin yksityiskohtiin.

Scrum määrittelee 3 erilaista _henkilöroolia_: kehittäjän (engl. developer), Scrum masterin ja Product ownerin. Product ownerille on kohtuullisen vakiintunut suomennos _tuotteen omistaja_, käytämme kuitenkin kurssilla pääosin englanninkielistä termiä.

Scrumiin kuuluvat _artefaktit_ eli "konkreettiset asiat" ovat _product backlog_ eli tuotteen kehitysjono, _sprint backlog_ eli sprintin tehtävälista sekä työn alla oleva ohjelmiston osa, englanniksi _potentially releasable increment_.

Scrumissa tekeminen rytmittyy _sprintteihin_ eli 1-4 viikon mittaisiin iteraatioihin. Sprintteihin kuuluu muutamia _standardipalavereja_ (engl. events): sprintin suunnittelupalaveri, daily scrum -palaverit, sprintin katselmointi sekä retrospektiivi.

### Product backlog

Product backlog (jonka virallinen, mutta harvoin käytetty käännös on tuotteen tehtäväkehitysjono) on priorisoitu lista asiakkaan tuotteelle asettamista vaatimuksista eli toivotuista ominaisuuksista ja toiminnoista. Backlog voi sisältää myös esimerkiksi isompia bugikorjauksia.

Hyvänä käytänteenä pidetään sitä, että backlogille kirjatut vaatimukset ovat asiakkaan tasolla mielekkäitä, arvoa tuottavia toiminnallisuuksia, esim. verkkokaupassa toiminnallisuus voisi olla _ostoksen voi lisätä ostoskorille_, tai opintohallintojärjestelmässä _opiskelija voi ilmoittautua HOPS:iin lisäämälleen kurssille_.

Backlogin kärjessä eli korkeimmilla prioriteetilla olevat vaatimukset valitaan toteutettavaksi seuraavan sprintin aikana, Tämän takia backlogin kärjessä olevat vaatimukset on yleensä kirjattu tarkemmin kuin backlogin häntäpään vaatimukset.

Usein on tarkoituksena myös estimoida eli arvioida backlogissa olevien vaatimusten toteuttamisen vaatima työmäärä. Työmääräarviot tekee kehittäjätiimi.

Scrum ei määrittele missä muodossa backlog ja siinä olevat vaatimukset esitetään. Viime vuosina on yleistynyt käytäntö, jossa tehtävät esitetään ns. _user storyinä_, tutustumme tähän tekniikkaan [osassa 2](/osa2/#user-story).

### Product owner

Scrumin mukaan kuka vaan voi milloin tahansa lisätä backlogiin uusia vaatimuksia. Backlogia priorisoi ainoastaan _product owner_ eli tuotteen omistaja.

Product owner on Scrumin mukaan yksittäinen henkilö. Priorisointiin voi toki olla vaikuttamassa useampikin henkilö, mutta Product owner tekee lopulliset päätökset prioriteettien suhteen.

Product owner kantaa vastuun backlogista ja täten kehityksen suunnasta, eli siitä mitä sovellukseen ollaan tekemässä ja missä järjestyksessä. Product ownerin tehtävänä on priorisoida product backlogilla olevat vaatimukset siten, että sovelluksen tilaaja/asiakas saa tuotteesta maksimaalisen hyödyn. Jotta product owner pystyy tähän, on hänen luonnollisesti kommunikoitava mahdollisimman laajalti kaikkien sovelluksen sidosryhmien kanssa.

Product ownerin vastuulla on myös varmistua siitä, että kehittäjätiimi varmasti ymmärtää toteutettavaksi valitut vaatimukset.

### Scrum master

Jokaisella Scrum-tiimillä on _scrum master_, eli henkilö, joka vastaa siitä että Scrumin pelisääntöjä ja henkeä noudatetaan kehitystyössä. Scrum master ei kuitenkaan ole perinteinen projektipäällikkö, vaan pikemminkin ryhmää tukeva valmentaja. Joissain yhteyksissä scrum masterin on luonnehdittu olevan _servant leader_.

Scrum masterin tehtävänä on muun muassa opastaa ryhmää hyvien käytänteiden noudattamisessa sekä rohkaista ja auttaa kehitystiimiä itseorganisoitumisessa sekä työskentelytapojen parantamisessa. Scrum master hoitaa myös käytännön asioita, esim. järjestää Scrumiin liittyviä palavereja ja koordinoi kommunikointia sidosryhmiin päin.

Scrum masterin ehkä keskeisin rooli on pyrkiä eliminoimaan kehitystyön esteitä. Esteenä on usein jokin tiimistä riippumaton asia, jonka poistamiseksi scrum master joutuu neuvottelemaan yrityksen hallinnon tai muiden ohjelmistotoimittajien kanssa. Tällaisen esteen voi muodostaa myös esimerkiksi se, että sovelluskehitystiimillä ei ole pääsyä tuotantoympäristöön tai edes vastaaviin palvelinympäristöihin, tai jos kehitettävä sovellus on riippuvainen muiden toimittajien vastuulla olevista rajapinnoista, ja ne eivät valmistu ajoissa tai toimi määritelmien mukaan.

"Este" voi myös liittyä ryhmän työskentelytapoihin, tällöin Scrum master opastaa ryhmää muuttamaan toimintaansa siten, että tuottavuutta haittaava este poistuu.

Scrum masterin roolina on myös taata kehitystiimille työrauha ja suojata tiimiä esim. ulkopuolisten yrityksiltä puuttua sprintin aikaiseen toimintaan.

Joissain tilanteissa scrum master toimii product ownerin apuna product backlogin ylläpitämisessä, tämä on tärkeää erityisesti silloin jos product owner on kokematon ja ei vielä osaa optimaalisella tavalla muotoilla backlogille lisättäviä käyttäjien sovellukselle asettamia vaatimuksia.

Scrum master siis pyrkii tekemään kaikkensa, jotta kehitystiimillä olisi optimaaliset olosuhteen asiakkaalle arvoa tuottavan sovelluksen kehittämiseen.

### Kehittäjätiimi

Kehittäjätiimi koostuu noin 3-9:stä henkilöstä, joista kaikista käytetään nimikettä developer. Vaikka kaikilla on sama nimike developer, voivat jotkut tiimin jäsenistä olla erikoistuneita tiettyyn osa-alueeseensa, esim. testaamiseen, tai backend-ohjelmointiin. Koko tiimi kuitenkin kantaa aina yhteisen vastuun kehitystyöstä.

Scrum-tiimien tulee olla _cross-functional_, eli tiimin tulisi pitää sisällään kaikki tarvittava osaaminen järjestelmän suunnitteluun, toteuttamiseen, testaamiseen ja jopa tuotantoympäristössä operoimiseen.

Tiimit ovat autonomisia, eli periaatteena on että kehitystiimiä ei johdeta ulkopuolelta vaan tiimi päättää miten moneen tuotteen backlogin priorisoidun vaatimuksen toteuttamiseen se kussakin sprintissä sitoutuu, eli miten paljon vaatimuksia backlogista valitaan sprintissä toteutettavaksi. Tiimi päättää myös tiettyjen reunaehtojen puitteissa itse miten se sprintin tavoitteen toteuttaa. Tiimi on siis _itseorganisoituva_ (self organizing).

Scrumin mukaan tiimin tulee oletusarvoisesti työskennellä samassa paikassa, mieluiten yhteisessä tiimille varatussa avokonttorissa ja oletuksena on että tiimin jäsenet työskentelevät tiimissä 100%:lla työajalla.

### Sprintti

Scrumissa kehitystyö siis jakautuu 1-4 viikon mittaisiin iteraatioihin eli sprintteihin.
Sprintin kesto on projektissa tyypillisesti aina sama, nykyään suosituin sprintin pituus lienee 2 viikkoa. Sprintti on "time-boxed", eli sprinttiä ei missään olosuhteissa pidennetä kesken sprintin.

Jokaisen sprintin alussa tiimi valitsee projektin backlogista sprintin aikana toteutettavat vaatimukset. Backlog on product ownerin toimesta priorisoitu ja vaatimukset valitaan aina priorisoidun listan kärjestä. Product owner siis näin ohjaa sen missä järjestyksessä asioita toteutetaan. Tiimi kuitenkin valitsee itse sprinttiin ainoastaan sen verran toteutettavaa minkä valmistumiseen se uskoo kykenevänsä sitoutumaan.

Sprintin aikana Scrum-tiimi toteuttaa itseorganisoidusti sprinttiin valitut ohjelmiston toiminnallisuudet.

Scrumissa periaatteena on, että jokaisen sprintin lopuksi tuotteesta on oltava olemassa _toimiva versio_ (engl. potentially shippable product increment), eli sprintin aikana on tarkoitus saada aikaan käyttöön valmiita ominaisuuksia, ei ainoastaan kasaa melkein toimivaa koodia.

Sprintin aikana tiimille ei esitetä uusia vaatimuksia, scrum master on vastuussa tiimin suojelemisesta jos joku ulkopuolinen yrittää saada kehitystiimin tekemään sprintin aikana muuta kuin siihen sovittuja backlogilta otettuja vaatimuksia.

### Definition of done

Eräs ketterän manifestin periaatteista nostaa ohjelmiston laadun ketteryyttä edistäväksi seikaksi

> Continuous attention to technical excellence and good design enhances agility.

Myös Scrum asettaa suuren painoarvon tuotetun ohjelmiston laadulle. Jokaisessa sprintissähän lopputuloksena tulee olla "potentially shippable", eli valmiiksi tehty, käyttöön valmis osa ohjelmistoa.

Jotta vallitsisi yksimielisyys siitä, minkälaisella laatutasolla ohjelmistoa on toteutettava, määritellään Scrumissa projektitasolla _definition of done_, suomeksi valmiin määritelmä, eli se mitä tarkoittaa, että jokin vaatimus on toteutettu valmiiksi.

Valmiiksi tehty määritellään useimmiten tarkoittamaan sitä, että vaatimus on analysoitu, suunniteltu, ohjelmoitu, testattu, testaus automatisoitu, dokumentoitu, integroitu muuhun ohjelmistoon ja viety tuotantoympäristöön.

Eli kun sprintin lopussa tavoitteena on olla toimiva ohjelma, tarkoitetaan sillä nimenomaan definition of donen tasolla toimivia ja valmiiksi tehtyjä vaatimuksia. Jos joitain ohjelman osia on tehty puutteellisesti, scrum master hylkää ne ja siirtää toteutettavaksi seuraavaan sprinttiin.

Jos sprintin aikana osoittautuu että tiimi ei ehdi toteuttamaan kaikkea mihin se sitoutui, ei ole hyväksyttävää tinkiä laadusta, vaan osa vaatimuksista jätetään seuraavaan sprinttiin.

Definition of done on eräs tapa millä Scrum pyrkii _läpinäkyvyyteen_, koska ketterässä ohjelmistokehityksessä tärkein edistymisen mittari on valmiina oleva ohjelmisto, on erittäin tärkeää, että kaikilla on sama näkemys mitä "valmis" tarkoittaa. Asia ei nimittäin ole ollenkaan itsestäänselvä, jos sitä ei tarkkaan määritellä. On melko yleistä, että kun ohjelmistokehittäjä ilmaisee jonkun ominaisuuden olevan kahden päivän ohjelmoinnin jälkeen "melkein valmis", kestää lopulta parikin viikkoa ennen kun asia on kokonaan valmis siinä mielessä että sovelluksen asiakkaat pääsevät käyttämään uutta ominaisuutta.

### Sprintin suunnittelu

Ennen jokaista sprinttiä järjestetään _sprint planning_ eli sprintin suunnittelukokous.

Aiemmin Scrum määritteli, että kokous on kaksiosainen, vuoden 2017 Scrum guide yksinkertaisti asioita ja nykyään puhutaan ainoastaan sprintin suunnittelun kahdesta aiheesta (engl. topic).

Ensimmäisenä aiheena on selvittää _mitä_ sprintin aikana tehdään. Product owner esittelee tiimille product backlogin kärjessä olevia vaatimuksia. Tiimin tulee päästä selvyyteen vaatimuksista sillä tasolla, että heidän on vähintäänkin summittaisesti mahdollista arvioida kuinka paljon vaatimuksen toteuttaminen vaatisi resursseja, sillä tiimin tulee arvioida kuinka monta backlogin vaatimuksista se kykenee sprintin aikana toteuttamaan _definition of donen määrittelemällä_ laadulla.

Sprintin aikana toteutettavien vaatimusten valinnan lisäksi asetetaan sprintin tavoite _sprint goal_, joka on yksittäisiä vaatimuksia geneerisempi ilmaus siitä, mitä tulevassa sprintissä on tarkoitus tehdä.

Suunnittelukokouksen toisena aiheena on selvittää _miten_ sprintin tavoitteet saavutetaan.

Tämä yleensä tarkoittaa, että tiimi suunnittelee toteutettavaksi valitut vaatimukset tarvittavalla tasolla. Suunnittelukokouksen toisen osan tuotoksena on usein lista tehtävistä (engl. task), jotka sprintin aikana on toteutettava, jotta sprinttiin valitut vaatimukset saadaan toteutettua. Suunnittelun aikana identifioidut tehtävät kirjataan sprintin backlogiin eli sprintin tehtävälistaan.

Toisin kuin "asiakkaan kielellä" kirjoitettu product backlog, sprintin backlogilla olevat asiat ovat usein ilmaistu sovelluskehittäjien kielellä, ja sisältävät monia teknisen tason asioita, jotka eivät vielä itsessään ole asiakkaan kannalta kiinnostavia. Sprint backlog onkin ennenkaikkia scrum-tiimin sovelluskehittäjien työnteon organisoinnin väline.

Sprint planningin maksimikesto on 8 tuntia jos sprinttien pituus on 4 viikkoa ja muuten 4 tuntia.

Palaamme sprintin suunnitteluun tarkemmin ja konkreettisten esimerkkien kanssa [osassa 2](/osa2/#sprintin-suunnittelu).

### Daily scrum – päiväpalaveri

Jokainen päivä sprintin aikana aloitetaan _daily scrumilla_ eli korkeintaan 15 minuutin mittaisella palaverilla. Palaveri pidetään aina samaan aikaan, samassa paikassa ja kaikkien kehittäjien oletetaan olevan paikalla.

Daily scrumin on tarkoituksena ylläpitää läpinäkyvyyttä siihen mitä sprintissä tapahtuu. Standardimallisessa päiväpalaverissa jokainen kehitystiimin jäsen vastaa vuorollaan kolmeen kysymykseen

- Mitä sain aikaan edellisen tapaamisen jälkeen?
- Mitä aion saada aikaan ennen seuraavaa tapaamista?
- Mitä esteitä etenemiselläni on?

Kuka tahansa saa olla seuraamassa daily scrumia, mutta vain tiimin jäsenillä on puheoikeus. Palaverin on tarkoitus olla lyhyt ja liian rönsyilevä keskustelu ei ole suotavaa. Jos joillakin ilmenee ongelmia tai etenemisen esteitä, scrum master huolehtii, että ongelmiin palataan asianomaisen kanssa daily scrumin jälkeen.

Jos muuhun palaverointiin, esim. suunnitteluun tai vaatimusten tarkentamiseen on tarvetta, tulee palaverit järjestää daily scrumista erillään. Scrum ei ota kantaa muihin sprintin aikaisiin palavereihin.

Syyskuun 3. 2019 ilmestynyt [A Scrum book](http://scrumbook.org/), jonka kirjoittajissa on mukana mm. toinen Scrumin kehittäjistä Jeff Sutherland, antaa hieman Scrum guidea laajemman ja mielenkiintoisemmankin kuvauksen siitä mikä [Daily Scrum -palaverin rooli](http://scrumbook.org/) on:

> Have a short event every day to replan the Sprint, to optimize the chances first of meeting the Sprint Goal and second of completing all Sprint Backlog Items. Strictly time-box the meeting to keep focus on the daily plan and to avoid robbing time from development. Focus on the next day’s work but keep the remainder of the Sprint in mind.

Pelkän statuspalaverin (mitä tein eilen, mitä tänään ja mitä esteitä minulla on) sijaan päiväpalaverin roolina on myös tarvittaessa uudelleensuunnata kehitystyötä siten, että sprintin tavoitteet pystyttäisiin edelleen saavuttamaan.

Eli siinä missä scrum guide antaa päiväpalaverille vaatimattoman läpinäkyvyyttä korostavan tehtävän, on uuden kirjan näkemyksen mukaan päiväpalaverilla roolinsa Scrumin inspect-and-adapt-syklissä, eli asioiden tilaa tarkastellaan ja tarvittaessa uudelleensuunnataan.

### Sprintin katselmointi

Sprintin päätteeksi järjestetään sprint review eli katselmointi. Katselmointi on informaali tilaisuus, jonka aikana kehitystiimi esittelee sprintin aikaansaannoksia kaikille kehitettävästä tuotteesta kiinnostuneille sidosryhmille.

Katselmoinnissa on tarkoituksena tarkastella, demota ja kokeilla toteutettua, toimivaa ohjelmistoa. PowerPoint-kalvojen näyttäminen katselmoinnissa on suorastaan kiellettyä.

Scrum master huolehtii, että katselmoinnissa demonstroidaan ainoastaan niitä ominaisuuksia, jotka on toteutettu kokonaan eli definition of donen tasolla. Näin pyritään antamaan mahdollisimman realistinen kuva siitä miten sovelluksen kehitys etenee.

Product owner varmistaa (joko katselmoinnissa tai ennen sitä), mitkä sprintissä kehitetyistä vaatimuksista on toteutettu hyväksyttävällä tavalla, eli että ne toimivat oletusten ja odotusten mukaan sen lisäksi että ne on toteutettu definition of donen määrittelemällä laatutasolla. Ne vaatimukset, joita ei hyväksytä toteutetuksi, siirretään takaisin product backlogiin viimeisteltäväksi myöhempien sprinttien aikana.

Katselmoinnin aikana kuka tahansa saa antaa palautetta tuotteesta ja esimerkiksi ehdottaa uusia vaatimuksia lisättäväksi product backlogiin. Katselmointi aiheuttaa usein myös tarpeen product backlogin osittaiseen uudelleenpriorisointiin.

Myös katselmoinnin kesto on rajoitettu (4h tai 2h riippuen sprintin kestosta).

### Retrospektiivi

Eräs ketterän manifestin periaatteista toteaa seuraavasti

> At regular intervals, the team reflects on how to become more effective, then tunes and adjusts its behavior accordingly.

Scrumissa jokaisen sprintin päätteeksi pidettävä _retrospektiivi_ on tämän periaatteen ilmentymä. Siinä missä Scrumin muut palaverit on tarkoitettu enimmäkseen tuotteen suunnan tarkasteluun, retrospektiivissä tiimi scrum masterin johdolla tarkastelee nimenomaan omaa työskentelyprosessiaan.

Tarkoituksena on identifioida mikä meni hyvin ja missä asioissa on parantamisen varaa. Palaverissa mietitään ratkaisuja joihinkin ongelmakohtiin, joita pyritään korjaamaan seuraavan sprintin aikana.

Aikojen saatossa on kehitetty [lukuisia tekniikoita](https://retrospectivewiki.org) retrospektiivien pitämiseen. Palaamme niihin laskareiden yhteydessä.

### Scrumin periaatteet: transparency - inspection - adaptation

Kuten aiemmin mainittiin, on Scrumin takana kolme periaatetta, läpinäkyvyys (transparency), tarkkailu (inspection) ja mukauttaminen (adaptation). Retrospektiivi on nimenomaan kehitysprosessin tarkkailun ja mukauttamisen väline.

Kehitettävän tuotteen tarkkailun ja sen suunnan mukauttamisen työkaluja ovat ensinnäkin lyhyt sprinteissä tapahtuva kehityssykli, tarvittaessa uudelleen priorisoitavissa oleva product backlog sekä säännölliset palaverit, aina sprinteittäisestä suunnittelusta ja katselmoinnista päiväpalaveriin.

Tarkkailun ja mukauttamisen taas mahdollistaa läpinäkyvyys, eli asioita ei piilotella, vaan sekä tuotteen kehityssuunta, valmiin määritelmä että menossa olevan sprintin status pidetään koko ajan avoimesti kaikkien nähtävillä ja asioista keskustellaan sekä sprintittäisellä että päivittäisellä tasolla.

Toisin sanoen asioiden läpinäkyvyys mahdollistaa niiden jatkuvan tarkkailun ja sen seurauksena sekä toimintatapoja että kehitettävää tuotetta on mahdollista mukauttaa haluttuun suuntaan.

![]({{ "/images/2-2.png" | absolute_url }})

### Scrumin arvot

Scrum guide nostaa esiin myös joukon _arvoja_ (engl. values) oleellisena seikkana sen taustalla että oikeanlainen mentaliteetti tehokkaaseen sovelluskehitykseen pääsee syntymään.

> When the values of commitment, courage, focus, openness and respect are embodied and lived by the Scrum Team, the Scrum pillars of transparency, inspection, and adaptation come to life and build trust for everyone.

Tiimin tulee olla _sitoutunut_ (commitment) yhteisen tavoitteen saavuttamiseksi ja _fokusoitua_ oikeiden asioiden tekemiseen. Tulee olla myös _rohkeutta_ tehdä päätöksiä ja kohdata myös vaikeimpia asioita, eli tulee olla avoimia sekä onnistumisten että ongelmien suhteen kuitenkin _kunnioittaen_ koko ajan kaikkia kehitystiimin jäseniä sekä ohjelmiston sidosryhmiä.

Syksyllä 2019 julkaistu [A Scrum book](https://pragprog.com/book/jcscrum/a-scrum-book) toteaa, että arvojen kautta syntyy _fertile soil_, eli hedelmällinen maaperä, jonka ansiosta sovelluskehityksen on mahdollista kukoistaa.

Scrumin ei siis pidä missään tapauksessa olla Scrum Guiden ohjeiden orjallista noudattamista. Jotta Scrum toimisi, tarvitaan sen soveltamiseen sopivanlainen asenne ja orientaatio. Scrumin inspect-and-adapt luonne jopa ohjaa siihen, että tiimien kannattaa jossain vaiheessa toimia joidenkin Scrumin ohjeiden vastaisesti, jos tiimin optimaalinen toiminta sitä vaatii.

## Scrumin ongelmia

Scrum on osoittautunut monin paikoin paremmaksi tavaksi ohjelmistojen kehittämiseen kuin vesiputousmalli tai muut suunnitelmavetoiset mallit. Scrum ei kuitenkaan ole mikään [silver bullet](https://en.wikipedia.org/wiki/No_Silver_Bullet), eli yleispätevä resepti, joka ratkaisisi kaikki sovelluskehityksen ongelmat, ja Scrumin käytön yleistyessä myös epäonnistuneiden Scrum-projektien määrä kasvaa.

Yhtenä syynä ongelmiin sanotaan olevan [ScrumBut](https://www.scrum.org/resources/what-scrumbut):

- We use Scrum, but having a Daily Scrum every day is too much overhead, so we only have one per week.
- We use Scrum, but Retrospectives are a waste of time, so we don't do them.
- We use Scrum, but we can't build a piece of functionality in two weeks, so our Sprints are 3 months long

ScrumButilla siis viitataan siihen että noudatetaan jotain Scrumin osa-alueita, mutta tehdään todella suuria kompromisseja joidenkin oleellisten osien suhteen ja näin ollen läpinäkyvyyden, tarkkailun tai mukauttamisen periaatteet vaarantuvat liikaa.

Hajautettu ohjelmistotuotanto, alihankkijoiden käyttö ja massiivista kokoluokkaa olevat projektit aiheuttavat edelleen haasteita Scrumille ja muillekin ketterille menetelmille vaikkakin asiaan on viime vuosina kiinnitetty huomiota. [Uncle Bob Martinin Scrum-kritiikki](https://www.infoq.com/news/2010/02/scrum-failings) nostaa esiin nämä ja muutamia muitakin oleellisia seikkoja:

- _No Technical Practices_: Scrum is a project management framework and doesn’t make any technical recommendations.
- _Automated Testing_: without high quality automated tests it is difficult to work in short cycles and know that stories are really done.
- _30 Day Sprints are too long_
- _Certification in CSM_: The Certificate that a Scrum Master, a trained CSM, holds means that on many teams only that person plays the role.
- _Scrum Master sometimes turns into Project Manager_: Some Scrum Masters use Scrum as a form of micro management and control.
- _Scrum carries an anti-management undercurrent_: "Scrum over-emphasizes the role of the team as self-managing. Self-organizing and self-managing teams are a good thing. But there is a limit. Scrum does not describe this with enough balance."
- _Multiple Teams_: Scrum and generic Agile have little to say about how to scale.
- _Insufficient Guidance Regarding the Product Backlog_

Koska Scrum ei ota mitään kantaa ohjelmistokehityksen _teknisiin periaatteisiin_, on suurena riskinä se, että sovelluksen sisäiseen laatuun ei kiinnitetä riittävää huomiota, ja tämä taas saattaa rapauttaa ketteryyden. Kehitys ehkä etenee aluksi nopeasti, mutta hidastuu ajan myötä sovelluksen teknisen velan tehdessä sen laajentamisen yhä vaikeammaksi. Erityisesti tätä riskiä nostaa se jos projektissa ei ole automaattisia testejä. Scrum ei ota mitään kantaa sovelluksen testaukseen.

Martin pitää scrum masterin roolia ongelmallisena monellakin tavalla. Ensinnäkin häntä hiertää sertifiointisysteemi, Scrum mastereita pikakoulutetaan parin päivän kursseilla ja joskus Scrum masterina toimiikin aiemmin projektimanagerin titteliä kantanut henkilö. Vaikka sertifikaatti on suoritettu, ei henkilön toimintatapaan ole välttämättä tullut muita muutoksia kuin uusi terminologia.

Vaikka Martin pelkää, että Scrum masterit monesti ovat ainoastaan managereita valekaavussa, hän pitää ongelmallisena myös sitä että Scrum olettaa tiimien olevan täysin itseorganisoituvia. Itseorganisoituminen toimii monissa konteksteissa ja joillakin tiimeillä, mutta sillä on rajansa, varsinkin jos tuotetta on tekemässä useita Scrum-tiimejä, voidaan ajautua ongelmiin jos luotetaan pelkkään itseorganisoitumiseen.

Monimutkaisen tuotteen hallinnoiminen on kompleksista, Scrum ei kuitenkaan ota millään tavalla kantaa product backlogin organisointiin ja jättää kehittäjät omilleen asian suhteen.

Uncle Bobin kritiikki on vuodelta 2010 mutta pitkälti validi edelleen.

Scrumin rinnalle viime vuosina voimakkaasti erityisesti Suomessa noussut [Scaled agile framework eli SAFe](https://www.scaledagileframework.com/) itseasiassa tarjoaa monia lääkkeitä Martininkin esiin nostamiin ongelmiin. SAFe on kuitenkin saanut myös voimakasta kritiikkiä ja autoritiivisetkin tahot (kuten Scrumin kehittäjä Ken Schwaber) ovat jopa kyseenalaistaneet menetelmän ketteryyden. Tutustumme SAFeen pintapuolisesti [osassa 5](/osa5/#laajan-skaalan-ketter%C3%A4t-menetelm%C3%A4t).

Scrum kuten muutkin ketterät kehitystavat ovat syntyneet pitkälti ohjelmistokehittäjien keskuudessa. Melko yleinen raportoitu ongelma ketterään kehitykseen siirryttäessä onkin se, että muu organisaatio jää täysin ennalleen. Tällöin tuloksena on usein nimikkeen [waterscrumfall](https://www.infoq.com/news/2011/12/water-scrum-fall-is-the-norm/) saanut kehitysmalli, missä ainoastaan ohjelman uusien toiminnallisuuksien kehitys tapahtuu Scrumia mukaillen, mutta budjetointi, vaatimusten hallinta sekä tuotantoonvienti etenevät edelleen vanhoja kontrolloituja prosesseja noudattaen.

Päätetään alustava Scrumiin tutustumisemme menetelmän kehittäjien sanoihin
_Scrum is easy to understand but extremely difficult to master_.
