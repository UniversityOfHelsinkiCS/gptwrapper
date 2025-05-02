---
layout: page
title: Osa 3
title_long: 'Ohjelmistojen laadunhallinta'
inheader: yes
permalink: /osa3/
---

<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/3.0/">
  <img alt="Creative Commons -lisenssi" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-sa/3.0/88x31.png"
  />
</a>

Tässä osassa tutustumme ohjelmistojen laadunhallintaan ja erityisesti ketterien menetelmien suosimiin testauksen ja laadunhallinnan menetelmiin.

## Typoja materiaalissa

{% include typo_instructions.md path="/osa3.md" %}

{% include norppa.md %}

## Laadunhallinnan peruskysymykset: verifiointi ja validointi

Ohjelmiston laadunhallintaan liittyy oleellisena asiana _verifiointi_ ja _validointi_.

_Verifioinnissa_ pyritään varmistamaan, että ohjelmisto toteuttaa vaatimusmäärittelyn aikana sille asetetut vaatimukset. Yleensä tämä tapahtuu testaamalla, että ohjelma toteuttaa vaatimusmäärittelyyn kirjatut toiminnalliset ja ei-toiminnalliset vaatimukset. Verifiointi siis pyrkii vastaamaan kysymykseen _are we building the product right_.

Validointi taas pyrkii varmistamaan, että ohjelmisto täyttää käyttäjän odotukset ja tarpeet. Vaatimusmäärittelyn aikana kirjatut ohjelmiston vaatimukset eivät ole aina se mitä käyttäjä todella tarvitsee. Validointiin liittyvä oleellinen kysymys onkin _are we building the right product_, eli ollaanko ylipäätään tekemässä oikeaa järjestelmää kulloiseenkin käyttötarkoitukseen.

Verifioinnin ja validoinnin tavoitteena on varmistaa, että ohjelma on "riittävän hyvä" siihen käyttötarkoitukseen, mihin ohjelma on tarkoitettu. Hyvyys on suhteellista ja riippuu ohjelman käyttötarkoituksesta. Ohjelman ei tarvitse yleensä olla täysin virheetön ollakseen kuitenkin riittävän hyvä käyttötarkoitukseensa.

Verifioinnin ja validoinnin suorittamista käytetään yleisesti nimitystä _laadunhallinta_ (engl. quality assurance, QA). Jos laadunhallinta on erillisen tiimin vastuulla, käytetään tästä usein nimitystä QA-tiimi.

## Laadunhallinnan tekniikat

Perinteisesti laadunhallinnassa on käytetty kahta erihenkistä tekniikkaa, katselmointeja/tarkastuksia sekä testausta.

_Katselmoinnissa_ (engl. review) käydään läpi ohjelmiston tuotantoprosessin aikana syntyneitä dokumentteja sekä ohjelmakoodia, ja etsitään näistä erilaisia ongelmia.

Tarkastukset taas (engl. inspection) ovat katselmoinnin muodollisempi versio.
Tarkastus suoritetaan järjestämällä formaali kokous, jolla on tarkkaan määritelty agenda ja kokouksen osallistujilla ennalta määritellyt roolit. Tarkastukset kuuluvat vesiputousmallin maailmaan ja eivät ole nykyään suosiossa lukuunottamatta turvallisuuskriittisten järjestelmien kehitystä.

Katselmointi on _staattinen tekniikka_, suorituskelpoista ohjelmakoodia ei välttämättä tarvita, ja jos katselmoinnin kohteena on ohjelmakoodi, ei ohjelmaa katselmoitaessa yleensä suoriteta.

Testaus taas on _dynaaminen tekniikka_, joka edellyttää aina ohjelmakoodin suorittamista. Testauksessa tarkkaillaan, miten ohjelma reagoi annettuihin testisyötteisiin.

## Vaatimusten validointi

Validointi siis vastaa kysymykseen, ollaanko tekemässä asiakkaan tarpeiden kannalta oikeanlaista järjestelmää.

Ohjelmistolle määritellyt vaatimukset onkin validoitava, eli on varmistettava, että määrittelydokumentti kuvaa sellaisen ohjelmiston, joka vastaa asiakkaan tarpeita.

Vesiputousmallissa määrittelydokumenttiin kirjattujen vaatimusten validointi suoritetaan nimenomaan katselmoimalla. Vaatimusmäärittely päättyy siihen, että asiakas katselmoi määrittelydokumentin ja varmistaa näin, että kirjatut vaatimukset vastaavat asiakkaan mielikuvaa tilattavasta järjestelmästä. Vesiputousmallia sovellettaessa määrittelydokumentti jäädytetään katselmoinnin jälkeen ja sen muuttaminen vaatii yleensä monimutkaista prosessia, ja saattaa edellyttää uutta sopimusta asiakkaan ja sovelluksen toimittajan kesken.

Ketterässä ohjelmistotuotannossa vaatimusten validointi tapahtuu iteraation päättävien demonstraatioiden (Scrumissa sprint reviewin) yhteydessä.

Asiakkaalle näytetään toimivaa versiota ohjelmistosta ja asiakas voi itse verrata, vastaako lopputulos sitä mitä asiakas lopulta haluaa. Asiakkaan tarvitsema toiminnallisuushan voi poiketa ennen iteraatiota määritellystä toiminnallisuudesta ja/tai ohjelmistokehittäjät saattavat tulkita väärin user storyjen kuvaamia vaatimuksia.

Jos asiakas havaitsee, että sovellus ei ole etenemässä haluttuun suuntaan, eli kirjatut vaatimukset eivät vastanneet todellista tarvetta, tarve on muuttunut tai vaatimuksia on tulkittu väärin, on seuraavassa iteraatiossa mahdollista ottaa korjausliike.

On ilmeistä, että ketterän mallin käyttämä vaatimusten validointitapa toimii paremmin tuotekehitystä muistuttavissa tilanteissa, joissa ollaan tekemässä tuotetta, joka on vaikea määritellä tarkkaan etukäteen.

## Koodin katselmointi

Koodin katselmointi eli koodin lukeminen jonkun muun, kuin ohjelmoijan toimesta on havaittu erittäin tehokkaaksi keinoksi koodin laadun parantamisessa. Katselmoinnin avulla voidaan havaita koodista ongelmia, joita on vaikea havaita testaamalla, esim. noudattaako koodi sovittua tyyliä ja onko koodi ylläpidettävää.

Koodin katselmoinnissa on perinteisesti käyty koodia läpi varmistaen, että koodista ei löydy erilaisissa "checklisteissä" lueteltuja riskialttiita piirteitä. Esimerkiksi eräs c-kielisten ohjelmien katselmoinnin checklist löytyy [täältä](http://www.oualline.com/talks/ins/inspection/c_check.html). Joissakin kielissä, esim. Javassa kääntäjän tekemät tarkastukset tekevät osan linkin takana olevan listan tarkistuksista turhaksi.

Nykyään on useita paljon katselmointia automatisoivia _staattista analyysiä_ tekeviä työkaluja, esimerkiksi Javan [Checkstyle](http://checkstyle.sourceforge.net/) ja Pythonin [Pylint](https://pypi.org/project/pylint/), joihin tutustuttiin jo viikon 2 laskareissa.

### Staattinen analyysi pilvessä

Pilvipalvelut ovat helpottaneet sovelluskehittäjien työtä monissa asioissa, esim. GitHubin ansiosta omaa versionhallintapalvelinta ei ole enää tarvinnut ylläpitää vuosiin.

Pilveen on viime aikoina ilmestynyt myös koodille staattista analyysiä tekeviä palveluita, esimerkiksi [Codeclimate](https://codeclimate.com/), joka analysoi koodista mm. seuraavia asioita:

- liian kompleksiset metodit ja luokat
- copy paste -koodi
- testaamaton koodi

Codeclimate antaa parannusehdotuksia huomaamistaan epäkohdista ja antaa jopa aika-arvion sille, kuinka kauan kunkin ongelmakohdan korjaamiseen menisi.

Codeclimate myös huomauttaa koodin laadun muutoksista, esim. jos koodin kompleksisuus kasvaa muutosten yhteydessä.

Minkä tahansa GitHubissa olevan projektin saa konfiguroitua Codeclimaten tarkastettavaksi nappia painamalla. Codeclimate suorittaa tarkastukset koodille aina kun uutta koodia pushataan GitHubiin.

Laitoksen harjoitustyökursseilla käytettävän Labtoolin vanhan version [Codeclimate-raportti](https://codeclimate.com/github/mluukkai/labtool) kertoo, että koodista löytyy yhteensä 22 epäilyttävää kohtaa. Koodin laadun saama arvosana on _C_ ja arvio sen siistimiseen kuluvasta ajasta on viikko:

![]({{ "/images/3-21.png" | absolute_url }}){:height="350px" }

Codeclimate erittelee jokaisen ongelman, ja antaa aika-arvion sille kuinka kauan virheen korjaamiseen menisi aikaa:

![]({{ "/images/3-22.png" | absolute_url }}){:height="350px" }

Vastaavia palveluita on nykyään useita, mm. [Codebeat](https://codebeat.co/) ja [Codacy](https://www.codacy.com/).

### Koodin katselmointi: GitHub ja pull requestit

Yhä enenevä määrä ohjelmistokehitysprojekteista tallettaa sovelluksen lähdekoodin GitHubiin. GitHubin _pull requestit_ tarjoavatkin hyvän ja paljon käytetyn työkalun koodikatselmointien tekoon.

Pull requesteja käytettäessä työn kulku on seuraava:

- Sovelluskehittäjä forkkaa repositorion itselleen, tekee muutokset omaan repositorioon ja tekee pull requestin projektia hallinnoivalle taholle.
- Hallinnoija, esimerkiksi tiimin "senior developer", open source -projektin vastaava tai joku muu sovelluskehittäjä tekee katselmoinnin pull requestille.
- Jos koodi ei ole vielä siinä kunnossa, että tehdyt muutokset voidaan liittää repositorioon, kirjoittaa hallinnoija pull requestin tekijälle joukon parannusehdotuksia.
- Muutosten ollessa hyväksyttävästi tehtyjä, pull request mergetään eli yhdistetään päärepositorioon.

Seuraavassa esimerkki [TMC-projektiin](https://tmc.mooc.fi/) tehdystä pull requestista ja siihen liittyvistä kommenteista:

![]({{ "/images/3-1.png" | absolute_url }}){:height="350px" }

Pull requestin kommentissa [sovelluskehittäjä](https://github.com/kennyhei/) toteaa, että pull requestin sisältämät commitit toteuttavat [tämän](https://github.com/testmycode/tmc-server/issues/185) GitHub-issuen kuvaaman toiminnallisuuden.

![]({{ "/images/3-2.png" | absolute_url }}){:height="500px" }

TMC:n silloinen [pääkehittäjä](https://github.com/mpartel/) ei kuitenkaan hyväksy muutoksia vielä mergettäväksi, vaan antaa muutaman parannusehdotuksen sovelluskehittäjälle.

Nykyään moni ohjelmistokehitystiimi käyttää säännöllisesti pull requesteja ja on jopa kirjannut definition of doneen, että eräs valmiin kriteeri koodille on se, että joku muu kuin ohjelmoija on katselmoinut sen. Katselmoija voi olla joko toinen sovelluskehittäjä, tai aloittelevien koodareiden tapauksessa joku hieman seniorimpi tiimin jäsen.

## Koodin katselmointi ketterissä menetelmissä

Toisin kuin Scrum, erityisesti 2000-luvun alkuvuosina erittäin suosittu ketterä menetelmä [eXtreme Programming ](http://www.extremeprogramming.org/) eli XP määrittelee useita ohjelmiston kehittäjän työskentelyyn kantaa ottavia käytänteitä.

Suurin osa XP:n käytänteistä on jo vuosikymmeniä hyvin tunnettuja _parhaita käytänteitä_ (engl. best practices), mutta kuitenkin usein vietynä äärimmäiseen (extreme) muotoon. Osa XP:n käytänteistä tähtää ohjelmiston laadun maksimoimiseen, ja muutama palvelee samaa funktiota kuin koodin katselmointi.

_Pariohjelmoinnissa_ (engl. pair programming) kaksi ohjelmoijaa työskentelee yhdessä käyttäen ainoastaan yhtä konetta. Koodia kirjoittava osapuoli toimii _ohjaajana_ (engl. driver) ja toinen _navigoijana_ (engl. navigator), roolia vaihdetaan sopivin väliajoin. Navigoija tekee koodiin _jatkuvaa katselmointia_.

Pariohjelmointi parantaa ohjelmoijien kuria ja työhön keskittymistä sekä on erinomainen oppimisen väline: parit oppivat toisiltaan, erityisesti noviisit kokeneemmilta. Jos pariohjelmointia sovelletaan systemaattisesti, ei koodiin jää osa-alueita, jotka ainoastaan yksi ohjelmoija tuntee.

Pariohjelmointia on tutkittu suhteellisen paljon. [Tutkimuksissa](https://collaboration.csc.ncsu.edu/laurie/Papers/XPSardinia.PDF) sen on todettu vähentävän bugien määrää jossain määrin, kokonaisuudessa resurssien kulutus kuitenkin nousee hieman. Tutkimukset korostavat pelkkien koodin tasolla näkyvien hyötyjen lisäksi myös pariohjelmoinnin myönteistä vaikutusta tiimidynamiikkaan ja jopa työtyytyväisyyteen.

Vaikka pariohjelmointi tai jopa useamman ihmisen versio siitä, [mob-programming](https://en.wikipedia.org/wiki/Mob_programming) on melko suosittua, ei kovin monissa paikoissa kuitenkaan harrasteta systemaattisesti määritelmän mukaista pariohjelmointia ainakaan joka päivä. Hyvin yleistä on, että kehittäjät työskentelevät suurimman osan aikaa yksin, mutta tekevät sopivin paikoin spontaaneja pari- tai mob-ohjelmointisessioita, erityisesti kohdatessaan teknisiä haasteita.

Pariohjelmoinnin ohella katselmoinnin kaltaisia tavoitteita koodin laadun nostajana voidaan ajatella olevan XP:n yhteisomistajuuden ja ohjelmointistandardien periaatteilla.

Koodin _yhteisomistajuus_ (engl. collective code ownership) tarkoittaa periaatetta, jossa kukaan yksittäinen ohjelmoija ei hallitse yksin mitään kohtaa koodista, eli kaikilla on lupa tehdä muutoksia ja laajennuksia mihin tahansa kohtaan koodia. Pariohjelmointi tukee yhteisomistajuutta.

Yhteisomistajuudessa on omat riskinsä: joku koodia kunnolla tuntematon voi saada huolimattomilla muutoksilla pahaa jälkeä aikaan. XP pyrkii eliminoimaan tästä aiheutuvia riskejä testaukseen liittyvillä käytänteillä, eli käytännössä automatisoiduilla regressiotesteillä.

_Ohjelmointistandardi_ (engl. coding standards) tarkoittaa, että tiimi määrittelee koodityylin, johon kaikki ohjelmoijat sitoutuvat. Tyylillä tarkoitetaan nimeämiskäytäntöä, koodin muotoilua ja myös tiettyjä ohjelman rakenteeseen liittyviä seikkoja. Ohjelmointistandardin noudattamista voidaan kontrolloida osittain automaattisesti staattisen analyysin työkaluilla, esimerkiksi Javan Checkstyle, Pythonin Pylint sekä JavaScript-maailman [eslint](https://eslint.org/) ja [prettier](https://prettier.io/) ovat työkaluja, joiden avulla voidaan seurata, että koodi seuraa määriteltyä ohjelmointistandardia. Eräs esimerkki suosituksi nousseesta ohjelmointistandardista on [AirBnB](https://airbnb.io/javascript/react/):n tyyliopas.

## Testaus

Ohjelmistojen osoittaminen virheettömäksi on käytännössä mahdotonta, sillä ohjelmiston mahdollisten käyttöskenaarioiden ja syötteiden kombinaatio on yksinkertaisesti liian suuri. Testauksen tarkoituksena onkin vakuuttaa asiakas ja järjestelmän kehitystiimi siitä, että ohjelmisto on riittävän hyvä käytettäväksi.

Testauksella on kaksi hieman eriävää tavoitetta. Ensinnäkin tulee _osoittaa, että ohjelmisto täyttää sille asetetut vaatimukset_. Käytännössä tämä tarkoittaa vaatimusmäärittelyssä kirjattujen asioiden toteutumisen demonstroimista toteutetusta ohjelmistosta. Toinen tavoite on _löytää ohjelmistosta virheitä_ eli testatessa yritetään rikkoa ohjelma tai saattaa se jollain tavalla epäkonsistenttiin tilaan. Näin havaitut viat pyritään korjaamaan ennen kuin todelliset käyttäjät törmäävät samoihin ongelmiin.

Molemmat näistä tavoitteista tähtäävät ensisijaisesti ohjelman _ulkoisen laadun_ (engl. external quality) eli käyttäjän kokeman laadun varmistamiseen. [Ulkoisella laadulla](http://c2.com/cgi/wiki?InternalAndExternalQuality) tarkoitetaan sitä, onko ohjelmisto sopiva käyttötarkoitukseensa, eli pystyykö käyttäjä tekemään ohjelmistolla haluamansa asiat.

## Testauksen tasot

Testaus jakaantuu eri _tasoihin_ sen mukaan, mikä testauksen ensisijaisena kohteena on. Ohjelmiston elinkaarta vesiputousmaisesti kuvaava _testauksen V-malli_ havainnollistaa testauksen eri tasoja.

![]({{ "/images/3-3.png" | absolute_url }}){:height="300px" }

Alimmalla tasolla on _yksikkötestaus_ (engl. unit testing), jossa tarkastellaan yksittäisten luokkien, metodien ja moduulien toimintaa, yleensä erillään muusta kokonaisuudesta. Yksikkötestauksen hoitavat sovelluskehittäjät.

_Integraatiotestaus_ (engl. integration testing) taas sisältää yksittäisistä komponenteista koostettujen kokonaisuuksien toiminnallisuuden testaamisen. Myös integraatiotestauksesta huolehtivat sovelluskehittäjät.

_Järjestelmätestauksessa_ (engl. system testing) varmistetaan, että ohjelmisto kokonaisuudessaan toimii vaatimuksiin kirjatulla tavalla. Ohjelmistoa testataan saman rajapinnan kautta, jonka kautta käyttäjät sitä käyttävät. Järjestelmätestauksesta on useimmiten vastuussa ohjelmiston kehittäjäorganisaation laadunhallinnasta vastaavat ihmiset.

Ohjelmiston tilaaja- tai käyttäjäorganisaation tekemää testausta kutsutaan _käyttäjän hyväksymistestaukseksi_ (engl. user acceptance testing), ja sen on tarkoitus varmistaa, että kehitetty ohjelmisto on varmasti odotuksien mukainen ja toimii oikeassa käytössä. Hyväksymistestaus tapahtuu monesti normaalissa tuotantokäytössä ohjelmiston tilanneen organisaation tai loppukäyttäjien toimesta, esim. betatestaamalla sovellusta pienen käyttäjäjoukon avulla. Hyväksymistestaus ei siis keskity siihen toimiiko ohjelmisto juuri niin kuin vaatimusmääritelmässä sanotaan, vaatimusmääritelmähän ei välttämättä kata täsmälleen sitä mikä käyttäjän todellinen tarve on.

## Järjestelmätestaus

Järjestelmätestauksen tarkoitus on siis varmistaa, että ohjelmisto toimii vaatimusmäärittelyssä kirjatulla tavalla. Sovellusta testataan useimmiten saman rajapinnan kautta, jonka kautta sitä käytetään, eli testaus voi tapahtua esimerkiksi graafisen käyttöliittymän kautta.

Järjestelmätestaus tapahtuu ilman tietoa järjestelmän sisäisestä rakenteesta, tälläistä testauksen tapaa nimitetään _black box_ -testaukseksi.

Järjestelmätesteille on tyypillistä, että ne tarkastelevat sovelluksen toiminnallisuutta sen kaikilla tasoilla käyttöliittymästä sovelluslogiikkaan ja tietokantaan. Tämän takia järjestelmätestejä kutsutaan usein _End to End -testeiksi_.

Yleensä järjestelmätestaus perustuu sovelluksen potentiaalisiin käyttöskenaarioihin. Jos vaatimukset on ilmaistu user storyina, on storyjen hyväksymiskriteereistä melko helppo muotoilla testejä, joiden avulla voidaan varmistaa, että ohjelmistolla on storyjen kuvaamat vaatimukset sekä tyypilliset virheskenaariot.

Sovelluksen toiminnallisuutta kartoittavan järjestelmätestauksen (jota joskus kutsutaan [funktionaaliseksi testaamiseksi](https://en.wikipedia.org/wiki/Functional_testing)) lisäksi on olemassa paljon [muitakin](https://en.wikipedia.org/wiki/System_testing) järjestelmätestauksen muotoja, mm.

- käytettävyystestaus
- suorituskykytestaus
- tietoturvan testaus

Järjestelmätestaus tapahtuu pääosin kehittäjäorganisaation toimesta. Joissain tapauksissa esim. tietoturvan tai suorituskyvyn testaaminen saatetaan antaa niihin erikoistuneiden tahojen vastuulle.

## Testitapausten valinta

Täysin kattava testaaminen on mahdotonta ja testaus on joka tapauksessa työlästä, eli onkin tärkeää löytää kohtuullisen kokoinen testitapausten joukko, jonka avulla on kuitenkin mahdollista löytää mahdollisimman suuri määrä virheitä.

Yksittäinen _testitapaus_ (engl. test case) testaa järjestelmän toiminnallisuutta jollain syötearvolla, tai arvojen kombinaatiolla jos toiminnallisuus edellyttää usean syötteen antamista. Monet syötteistä ovat järjestelmän toiminnan kannalta samanlaisia. Esimerkiksi, jos henkilötietoja käsittelevä järjestelmä tallettaa henkilön iän, on todennäköistä, että järjestelmän toiminta ei poikkea ollenkaan sen suhteen, onko ikä 20 tai 30, mutta jos ikä taas on 17, saattaa järjestelmän toiminnallisuus olla erilainen kuin iän ollessa vähintään 18.

Testeissä kannattaakin pyrkiä jakamaan syötteet _ekvivalenssiluokkiin_, eli ryhmiin joihin kuuluvien syötteiden suhteen ohjelma toimii oleellisesti samalla tavalla. Testitapauksia kannattaa tehdä useimmiten ainoastaan yksi tai kaksi kutakin ekvivalenssiluokkaa tai syötteiden ekvivalenssiluokkien kombinaatiota kohti. Ekvivalenssiluokkien edustajiksi kannattaa erityisesti valita ekvivalenssiluokkien _raja-arvoja_, koodissa olevat bugit nimittäin liittyvät erittäin usein toisto- ja ehtolauseiden ehtojen äärimmäisiin arvoihin.

Esimerkiksi henkilötietoja käsittelevässä järjestelmässä iän suhteen ekvivalenssiluokkia olisivat ehkä _alaikäinen_ 0-17 vuotta, _työikäinen_ 18-65 vuotta ja _eläkeläinen_ 66- vuotta. Ekvivalenssiluokkien raja-arvojen järkevä määrittely tosin edellyttää tietoa järjestelmän toiminnallisuudesta. Todennäköisesti työikäisten ja eläkeläisten suhteen ei olisi mahdollista tehdä selkeää jakoa iän perusteella. Jos oletetaan, että edelliset ekvivalenssiluokat olisivat järkeviä, sopivat iän _raja-arvot_ testitapauksia varten olisivat 17, 18, 65 ja 66 vuotta, eli näitä kaikkia kohti voitaisiin tehdä oma testitapauksensa.

Tarkastellaan toisena esimerkkinä tekstitv:n selainversiota.

![]({{ "/images/3-4.png" | absolute_url }}){:height="450px" }

Mitä testitapauksia kannattaisi valita tekstitv:n sivun valintaikkunan toimivuuden testaamisessa?

Tekstitv:n sivu vastaa lukua väliltä 100-899. Osaa välin luvuista vastaavaa sivua ei kuitenkaan ole olemassa.

Syötteen ekvivalenssiluokkia olisivat ainakin seuraavat:

- olemassa olevaa sivua vastaavat luvut
- validit luvut, jotka eivät vastaa mitään sivua
- liian pienet ja liian suuret luvut
- syötteet, jotka sisältävät kiellettyjä merkkejä (esimerkiksi aakkosia)
- tyhjä syöte

Jos testeistä halutaan kattavat, olisi jokaisesta ekvivalenssiluokasta hyvä valita ainakin yksi testattava syötearvo.

Olemassa olevaa sivua vastaavan ekvivalenssin rajatapaukset, eli luvut 100 ja 899 kannattaisi ehkä valita testisyötteiksi, samoin luvut 99 ja 900, jotka ovat oman ekvivalenssiluokkansa rajatapauksia.

## Yksikkötestaus

Yksikkötestauksen kohteena siis ovat yksittäiset metodit ja luokat. Yksikkötestauksen hoitavat ohjelmoijat. Usein oletetaan, että uuteen koodiin tehdään yksikkötestit jo samalla kuin koodi kirjoitetaan. Ohjelmoijien vastuulla olevasta testauksesta, eli yksikkö- ja integraatiotestauksesta käytetään usein nimitystä [developer testing](https://developertesting.rocks/).

Yksikkötestejä laadittaessa saatetaan ottaa huomioon testattavan koodin rakenne, esimerkiksi minkälaisia ehtolauseita koodissa on käytetty. Jos testeissä huomioidaan testattavan järjestelmän sisäinen rakenne, puhutaan usein _lasilaatikkotestauksesta_ (engl. white box testing).

Yksikkötestauksella ei testata suoranaisesti sitä, täyttääkö ohjelmisto käyttäjän sille asettamat vaatimukset, pikemminkin tavoitteena on ohjelman _sisäisen laadun_ (engl. internal quality) kontrollointi. [Sisäinen laatu](http://c2.com/cgi/wiki?InternalAndExternalQuality) viittaa koodin sisäisen rakenteen hyvyyteen: onko koodia helppo jatkokehittää, onko virheiden jäljitys ja korjaaminen helppoa ja pystytäänkö koodin toiminnallisuuden oikeellisuus varmistamaan muutoksia tehtäessä.

Sisäinen laatu kiinnostaa ensisijaisesti ohjelmistokehittäjiä: jos koodi on sisäiseltä laadultaan heikkoa, on sen parissa työskenteleminen ikävää ja hidasta. Jos koodin sisäinen laatu alkaa rapistua, sovelluksen kehitystahti hidastuu, ja ohjelmistoon alkaa todennäköisesti kertymään enenevissä määrin bugeja jotka näkyvät myös loppukäyttäjälle asti.

Pelkkä sisäisen laadun kontrollimekanismi yksikkötestaus ei siis ole. Kattavilla yksikkötesteillä saadaan parannettua myös ohjelman ulkoista, eli asiakkaan kokemaa laatua. Yksikkötestit voivat eliminoida joitain asiakkaalle näkyviä virheitä, joita järjestelmätestauksen testitapaukset eivät löydä.

Tiedetään, että bugit on taloudellisesti edullista paikallistaa mahdollisimman aikaisessa vaiheessa, eli yksikkötestauksessa löydetty virhe on halvempi ja nopeampi korjata kuin integraatio- tai järjestelmätestauksessa löytyvä, tai vasta todellisessa käytössä ilmennyt virhe.

Koska yksikkötestejä joudutaan suorittamaan moneen kertaan, tulee niiden suorittaminen ja testien tulosten raportointi automatisoida, ja nykyinen hyvä työkalutuki tekeekin automatisoinnin helpoksi. Java-maailmasta tuttu JUnit on edelleen yksi suosituimpia testikirjastoja, uudempia tulokkaita ovat mm. Rspec (Ruby), Mocha ja Jest (JavaScript). Pythonin suosituin yksikkötestauskirjasto on ensimmäisistä laskareista tuttu unittest.

Kurssilla [Ohjelmistotekniikka](https://courses.helsinki.fi/fi/tkt20002) tehdyt testit ovat useimmiten juurikin yksikkötestejä.

### Mitä ja miten paljon tulee testata?

Mitä kaikkea ohjelmistosta tulisi testata yksikkötesteillä? Vastaus ei ole helppo. JUnitin alkuperäinen kehittäjä [Kent Beck](https://junit.org/junit4/faq.html#best_2) vastaa kysymykseen seuraavasti:

> "Do I have to write a test for everything?"
> "No, just test everything that could reasonably break"

Jos pyritään kattavaan yksikkötestaukseen, tulisi ainakin testata kaikkien metodien (ja loogisten metodikombinaatioiden) toiminta parametrien hyväksyttävillä arvoilla ja virheellisillä parametrien arvoilla.

Parametrien mahdolliset arvot kannattaa jakaa ekvivalenssiluokkiin ja jokaisesta luokasta kannattaa valita ainakin yksi arvo testisyötteeksi. Erityisesti ekvivalenssiluokkien raja-arvot kannattaa valita mukaan testattaviin arvoihin.

Koska yksikkötestejä tehtäessä ohjelmakoodi on nähtävillä, on testien parametrien ekvivalenssiluokat ja raja-arvot useimmiten pääteltävissä koodista.

Tarkastellaan esimerkkinä ensimmäisen viikon laskareista tutun _Ohtuvaraston_ metodia _otaVarastosta_. Mitä testitapauksia tulisi generoida, jotta testit olisivat kattavat?

```python
class Varasto:
    def __init__(self, tilavuus, alku_saldo = 0):
        self.tilavuus = max(tilavuus, 10)
        self.saldo = min(tilavuus, max(alku_saldo, 0))

    def ota_varastosta(self, maara):
        if maara < 0:
            return 0.0

        if maara > self.saldo:
            kaikki_mita_voidaan = self.saldo
            self.saldo = 0.0

            return kaikki_mita_voidaan

        self.saldo = self.saldo - maara

        return maara
```

Metodia _otaVarastosta_ testatessa testitapauksessa on huomioitava parametrin _maara_ lisäksi varaston tilanne. Varaston tilanteella on kolme "ekvivalenssiluokkaa":

- _tyhjä_ (esim. saldo 0, tilavuus 10)
- _ei tyhjä eikä täysi_ (esim. saldo 5, tilavuus 10)
- _täysi_ (saldo 10, tilavuus 10).

Näitä kutakin kohti on metodin parametrilla _maara_ omat ekvivalenssiluokkansa. Jos varasto on "puolitäysi", eli saldo on 5, muuttujan _maara_ arvoiksi voitaisiin valita _-1, 0, 5, 6_. Jos varasto on täysi, muuttujan _maara_ arvoiksi sopisivat _-1, 0, 10, 11_. Jos varasto on tyhjä, muuttujan _maara_ arvoiksi voidaan valita _-1, 0, 1_.

Nollan ja negatiivisen määrän ottamista tuskin kannattaa erikseen testata kaikkien varastotilanteiden suhteen, tosin tämäkin voisi olla riski, jos varaston sisäinen toteutus muutettaisiin täysin.

Huomaamme siis, että jo naurettavan pienen luokan yhden metodin kattava testaaminen vaatii suuren määrän testitapauksia. Useimmissa tapauksissa ei kuitenkaan ole realistista olettaa, että testejä tehdään vastaavalla kattavuudella, aika/hyötysuhde on yksinkertaisesti liian huono. Useimmat softassa olevat ikävät bugit jäävät joka tapauksessa yksikkötestauksen ulottumattomiin.

### Testauskattavuus

Yksikkötestien (ja toki myös muunlaisten testien) hyvyyttä voidaan mitata _testauskattavuuden_ (engl. test coverage) käsitteellä. Testauskattavuutta on muutamaa eri tyyppiä.

_Rivikattavuudella_ (engl. line coverage) tarkoitetaan kuinka montaa prosenttia ohjelman koodiriveistä testitapausten suorittaminen käy läpi. Vaikka rivikattavuus olisi 100% ei tämä tietenkään tarkoita, että kaikki oleellinen toiminnallisuus olisi tutkittu.

_Haarautumakattavuudella_ (engl. branch coverage) tarkoitetaan kuinka montaa prosenttia testattavan metodin/luokan sisältävistä ehtolauseiden haaroista testit ovat käyneet läpi.

Monet työkalut, esim. laskareissa käyttämämme JaCoCo (Java) ja coverage (Python) mittaavat testien suorituksen yhteydessä testauskattavuuden. Muitakin kattavuuden tyyppejä on olemassa, mm. ehtokattavuus ja polkukattavuus, useat työkalut eivät niitä kuitenkaan tue.

Seuraavassa esimerkki JaCoColla mitatusta rivi- ja haarautumakattavuudesta:

![]({{ "/images/3-5.png" | absolute_url }}){:height="350px" }

JaCoCo ilmoittaa sekä rivi- (instruction) että haarautumakattavuuden (branches). Puutteellisesti testattu haarautumiskohta esim. if ilmaistaan keltaisella.

Testauskattavuus toimii siis hyvänä apuvälineenä sen arvioimisessa testataanko sovellusta riittävästi.

### Mutaatiotestaus

Pelkkä testikattavuus ei kuitenkaan vielä kerro oikeastaan mitään testien hyvyydestä. Hyvät testit ovat sellaisia, että jos ohjelmaan tulee bugi, huomaavat testit virheen. Testien hyvyys taas riippuu oleellisesti testien syötteiden lisäksi siitä, minkälaisia assert-lauseilla suoritettavia tarkistuksia testeissä on.

_Mutaatiotestauksen_ (engl. mutation testing) idea on nimenomaan testata testitapausten hyvyyttä generoimalla koodiin systemaattisesti mutantteja eli pieniä "bugeja", ja katsoa havaitsevatko testit koodiin tulleet bugit.

Erilaisia mutanttityyppejä, joita mutaatiotestauksessa generoidaan koodiin on paljon mm.

- manipuloidaan ehtolausetta: <tt>if ( x<0 )</tt> muutetaan muotoon <tt>if (x <= 0)</tt> tai <tt>if ( true ) </tt>
- vaihdetaan operaattoria: <tt>x += 1</tt> muutetaan muotoon <tt>x -= 1</tt>
- kovakoodataan paluuarvo: <tt>return x;</tt> muutetaan muotoon <tt>return true;</tt>
- korvataan konstruktorikutsu: <tt>olio = new Olio()</tt> muutetaan muotoon <tt>olio = null;</tt>

Mutaatiotestauksen ongelmana on mutaatioiden suuri määrä ja ns. _ekvivalentit mutantit_, joiden takia mutaatiotestauksen tulos vaatii aina ihmisen tulkintaa.

Ekvivalentti mutantti tarkoittaa sellaista koodiin tehtyä muutosta, joka ei kuitenkaan muuta ohjelman toiminnallisuutta. Eli tälläisen mutantin lisäämistä koodiin ei voi mikään testi havaita. Mutantin toteaminen ekvivalentiksi algoritmisesti on mahdotonta.

Lisätietoa mutaatiotestauksesta esim. [Wikipediassa](http://en.wikipedia.org/wiki/) ja [pit](http://pitest.org/)-työkalun sivulla.

## Integraatiotestaus

Järjestelmän yksittäiset, erillään yksikkötestatut luokat tulee integroida toimivaksi kokonaisuudeksi. Integroinnin yhteydessä tai sen jälkeen suoritetaan integraatiotestaus, missä painopiste on ohjelman komponenttien välisten rajapintojen toimivuuden tutkimisessa sekä komponenttien yhdessä tuottaman toiminnallisuuden oikeellisuuden varmistamisessa.

Järjestelmän integrointi voi edetä joko järjestelmän rakenteeseen perustuen tai järjestelmän toteuttamien ominaisuuksien mukaan.

_Rakenteeseen perustuvassa integraatiossa_ keskitytään kerrallaan sovelluksen yksittäisten rakenteellisten komponenttien integrointiin. Esimerkiksi verkkokaupan toteutuksessa integroitaisiin ensin arkkitehtuurilliset komponentit tai kerrokset, eli sovelluslogiikan luokat, käyttöliittymän toteutus ja tietokantarajapinta omina kokonaisuuksinaan. Tämän jälkeen kerrokset integroitaisiin kokonaiseksi sovellukseksi.

_Ominaisuuksiin perustuvassa integroinnissa_ taas liitetään yhteen alikomponentit, jotka toteuttavat järjestelmän loogisen toiminnallisuuden. Verkkokaupassa voitaisiin esimerkiksi integroida kerrallaan kaikki toiminnallisuuteen _lisää tuote ostoskoriin_ liittyvä koodi ja edetä toiminnallisuus kerralla kunnes koko sovellus on valmis.

Vesiputousmallin kulta-aikoina "vanhan liiton" ohjelmistotuotannossa toimintatapa oli se, että kaikki ohjelman yksittäiset komponentit ohjelmoitiin ja yksikkötestattiin erikseen ja tämän jälkeen ne integroitiin (yleensä rakenteeseen perustuen) kerralla yhteen.

Tällainen vesiputousmallin maailmassa yleinen, nimikkeellä _big bang_ -integraatio kulkeva tekniikka on osoittautunut todella riskialttiiksi (siitä on seurauksena usein ns. integraatiohelvetti) ja sitä ei enää kukaan täysijärkinen suosittele käytettäväksi.

Moderni ohjelmistotuotanto suosii ns. _jatkuvaa integraatiota_ (engl. continuous integration), joka on hyvin tiheässä tahdissa tapahtuvaa ominaisuuksiin perustuvaa integrointia. Palaamme aiheeseen tarkemmin pian.

Itseasiassa koko termi _integraatiotestaus_ on käsitteenä melko häilyvä, ja joskus on vaikea tehdä selkeää rajanvetoa yksikkö- ja integraatiotestauksen välillä. Useimmiten ajatellaan että yksikkötestien kohteena on yksittäinen metodi, luokka tai ohjelmamoduuli. Entä jos testauksen alla oleva luokka/moduuli pitää sisällään rajapinnan takana useita muitakin luokkia, onko kyseessä enää yksikkötesti vai onko kyseessä jo suurempaa kokonaisuutta kartoittava integraatiotesti?

Integraatiotestaukseksi luokiteltavia testejä ovat ainakin seuraavanlaiset, selkeästi isompia osakokonaisuuksia testaavat testit

- sovelluslogiikan ja tietokannan yhteistoiminnallisuuden varmistaminen
- sovelluksen palvelimen eli backendin tarjoaman HTTP-rajapinnan oikean toiminnallisuuden varmistaminen

Yksikkötestauksen tapaan, koodin integroinnin ja usein myös integraatiotestauksen katsotaan nykyään olevan sovelluskehittäjien vastuulla, eli integraatiotestaus kuuluu käsitteen [developer testing](https://developertesting.rocks/) alle.

## Regressiotestaus

Iteratiivisessa ja ketterässä ohjelmistotuotannossa, jossa jokainen iteraatio tuottaa ohjelmistoon uusia ominaisuuksia, on oltava koko ajan valppaana sen suhteen, että lisäykset eivät hajota ohjelman jo toimivia osia.

Testit on siis suoritettava uudelleen aina kun ohjelmistoon tehdään muutoksia. Tätä käytäntöä kutsutaan _regressiotestaukseksi_. Jotta varmuus ohjelmiston virheettömänä pysymisestä olisi mahdollisimman suuri, tulee regressiotestien joukon koostua sekä yksikkö-, integraatio- että järjestelmätesteistä.

Usein regressiotesteinä käytetään kaikkia sovelluskehityksen aikana tehtyjä testejä. On myös tilanteita, joissa tämä ei ole mielekästä esimerkiksi testien suorituksen viemän ajan takia, ja sopiva osajoukko kaikista testeistä voi taata riittävän luottamuksen sovelluksen virheettömänä säilymisestä.

Testaaminen on erittäin työlästä ja regressiotestauksen tarve tekee siitä entistä työläämpää. Tämän takia on erittäin tärkeää pyrkiä automatisoimaan testit mahdollisimman suurissa määrin.

Automatisoitu yksikkötestaus on jo aiemmilta kursseilta tuttu aihe. Käsittelemme muutamia järjestelmätestauksen automatisoinnin menetelmiä seuraavissa luvuissa.

## Ketterien menetelmien testauskäytänteitä

Testauksen rooli ketterissä menetelmissä poikkeaa huomattavasti vesiputousmallisesta ohjelmistotuotannosta. Iteraation/sprintin aikana toteutettavat ominaisuudet integroidaan muuhun koodiin ja testataan yksikkö-, integraatio- sekä järjestelmätasolla. Sykli ominaisuuden määrittelystä siihen, että se on valmis ja testattu on erittäin lyhyt, viikosta kuukauteen.

Testausta tehdäänkin sprintin "ensimmäisestä päivästä" lähtien ja testaus on integroitu suunnitteluun ja toteutukseen, eikä ole ketterän näkemyksen mukaan enää oma erillinen vaiheensa.

Ketterän kehityksen luonne vaatiikin, että testejä voidaan suorittaa usein ja mahdollisimman vähällä vaivalla, siispä automatisoitu regressiotestaus on avainasemassa.

Kuten Scrumin käsittelyn yhteydessä [mainittiin](/osa1#kehittäjätiimi), ketterien sovelluskehitystiimien tulisi olla _cross functional_, eli sisältää kaikki tietotaito, mitä järjestelmän kehittäminen ja tuotantokäyttöön valmiiksi saattaminen edellyttää. Tämän takia testaajat ovat ideaalitilanteessa sijoitettu erillisen laatua valvovan QA-organisaation sijaan kehittäjätiimeihin, ja myös ohjelmoijat kirjoittavat testejä.

Testaajan rooli muuttuu virheiden etsijästä virheiden estäjään: testaaja auttaa tiimiä kirjoittamaan automatisoituja testejä, jotka pyrkivät estämään bugien pääsyn koodiin. Eräänä kantavana teemana ketterässä laadunhallinnassa onkin "sisäänrakentaa laatu tuotteisiin", eli Lean-maailmasta tuttu periaate [build quality in](https://www.101ways.com/2010/09/06/lean-principles-2-build-quality-in/). Tämä tarkoittaa sitä, että laadunhallintaan ei suhtauduta erillisen organisaation (esim. QA-tiimin) vastuulla olevana asiana, vaan sovelluskehityksessä on jo lähtökohtana se, että bugeja ei pääse syntymään, ja jos pääsee, ne tulee havaita mieluiten jo ohjelmointivaiheessa.

Käymme tässä luvussa läpi joukon ketterien menetelmien suosimia testauskäytäntöjä.

_Test driven development_ eli TDD on kehitysmenetelmä, missä testit tehdään jo ennen koodin kirjoittamista. Nimestään huolimatta kyseessä tosin on enemmän suunnittelu- ja toteutustason tekniikka, jonka sivutuotteena syntyy kattava joukko automaattisesti suoritettavia testejä.

User storyjen tasolla tapahtuva automatisoitu testaus, joka kulkee nimillä _acceptance test driven development_ ja _behavior driven development_.

_Continuous Integration_ eli jatkuva integraatio ja _continuous delivery_ eli jatkuva toimitusvalmius ovat perinteisen integraatio- ja integraatiotestausvaiheen korvaava työskentelytapa, jossa pyrkimyksenä on integroida ja jopa viedä tuotantoympäristöön jokainen sovellukseen tehty muutos.

Kaikista edellisistä käytänteistä seurauksena on suuri joukko eritasoisia (eli yksikkö-, integraatio-, järjestelmä-) automatisoituja testejä, joiden avulla tehty regressiotestaus mahdollistaa sen, että ohjelmiston jatkokehityksen aikana voidaan olla turvallisin mielin siitä, että jo toimivia asioita ei pääse hajoamaan.

Nousevana trendinä on suorittaa uusien ominaisuuksien laadunhallintaa myös siinä vaiheessa kun osa oikeista käyttäjistä on jo ottanut ne käyttöönsä. Tehdään testaus miten kattavasti tahansa, on kuitenkin hyvin tyypillistä, että tiettyjä ongelmia ilmenee vasta todellisessa käytössä. Tuotantokäytössä tapahtuva testaus on suurta kurinalaisuutta vaativa menetelmä, joka vaatii pitkälle kehittynyttä automatisointia ja ohjelmiston sofistikoitunutta monitorointia.

Voimakkaasta automatisointitrendistä huolimatta myös manuaalisesti tehtävällä testauksella on edelleen paikkansa. _Tutkiva testaus_ (engl. exploratory testing) on pääosin manuaalinen järjestelmätestauksen tekniikka, jossa testaaminen tapahtuu ilman tarkkaa etukäteen tehtävää testaussuunnitelmaa. Testaaja luo lennossa uusia testejä edellisten testien antaman palautteen perusteella. Tutkivaa testausta käytetään usein kokonaan uusien ohjelmiston ominaisuuksien testaamiseen.

## Test driven development

[Test driven development](https://martinfowler.com/bliki/TestDrivenDevelopment.html) eli TDD (suomeksi testivetoinen kehitys) on yksi [eXtreme Programmingin](http://www.extremeprogramming.org/) käytänteistä, missä siis testit on tarkoitus tehdä ennen varsinaisen koodin kirjoittamista.

Alan auktoriteettien kuten Kent Beckin ja Uncle Bob Martinin [määritelmän mukainen](http://butunclebob.com/ArticleS.UncleBob.TheThreeRulesOfTdd) TDD etenee seuraavasti

1. Kirjoitetaan testiä sen verran että testi ei mene läpi. Ei siis luoda heti kaikkia luokan tai metodin testejä, vaan edetään yksi testi kerrallaan.
2. Kirjoitetaan koodia sen verran, että testi saadaan menemään läpi. Ei yritetäkään heti kirjoittaa "lopullista" koodia.
3. Jos huomataan koodin rakenteen menneen huonoksi (eli havaitaan koodissa esimerkiksi toisteisuutta tai liian pitkiä metodeja) _refaktoroidaan_ koodin rakenne paremmaksi, ja huolehditaan koko ajan, että testit menevät edelleen läpi. Refaktoroinnilla tarkoitetaan koodin sisäisen rakenteen muuttamista siten, että sen rajapinta ja toiminnallisuus säilyy muuttumattomana.
4. Jatketaan askeleesta 1.

TDD:n etenemisestä käytetään usein nimitystä _red-green-refactor_, eli tehdään testi joka on punaisella, kirjoitetaan koodia siten että testit menevät taas vihreäksi ja jos tarvetta, niin refaktoroidaan. Seuraava kuva havainnollistaa syklin etenemistä:

![]({{ "/images/3-6a.png" | absolute_url }}){:height="250px" }

TDD:llä ohjelmoitaessa toteutettavaa komponenttia ei yleensä ole tapana suunnitella tyhjentävästi etukäteen. Testit kirjoitetaan ensisijaisesti ajatellen komponentin käyttöä, eli huomio on komponentin rajapinnassa ja rajapinnan helppokäyttöisyydessä, ei niinkään komponentin sisäisessä toteutuksessa. Komponentin sisäinen rakenne muotoutuu refaktorointien kautta.

TDD:ssä perinteisen suunnittelu-toteutus-testaus -syklin voi ajatella kääntyneen täysin päinvastaiseen järjestykseen, komponentin tarkka suunnittelu tapahtuu vasta refaktorointien yhteydessä.

### TDD:n hyviä puolia

TDD:tä tehtäessä korostetaan yleensä lopputuloksen yksinkertaisuutta, tarkoituksena on toteuttaa toiminnallisuutta vain sen verran, mitä testien läpimeno edellyttää. Ei siis toteuteta "varalta" ekstratoiminnallisuutta, sillä sitä ei todennäköisesti tarvita. Tästä yksinkertaisiin ratkaisuihin pyrkivästä käytännöstä käytetään usein nimitystä ["You ain't gonna need it", YAGNI](https://martinfowler.com/bliki/Yagni.html). Sama periaate on kirjattuna ketterään manifestiin muodossa _Simplicity – the art of maximizing the amount of work not done – is essential_.

Koodista on vaikea tehdä helposti testattavissa olevaa, jos se ei ole modulaarista ja löyhästi kytketyistä selkeän rajapinnan omaavista komponenteista koostuvaa. Määritelmän mukaisella TDD:llä ohjelmoitaessa taas koodista tulee useimmiten jo lähtökohtaisesti modulaarista ja vähäistä turhilta riippuvuuksiltaan. Tälläisen koodin taas on huomattu olevan laadukasta ylläpidettävyyden ja laajennettavuuden kannalta. Eli eräs argumentti TDD:n puolesta on juuri ollut sen tuottama laajennettavuuden ja jatkokehitettävyyden kannalta edullinen koodin laatu.

Muina TDD:n hyvinä puolina mainitaan, että se rohkaisee ottamaan pieniä askelia kerrallaan ja näin toimimaan fokusoidusti, ja että hyvin kirjoitetut testit toimivat toteutetun komponentin rajapinnan dokumentaationa.

TDD:tä on tutkittu akateemisesti kohtuullisen paljon. Kovin suurta evidenssiä sen hyödyistä [ei ole](https://researchportal.helsinki.fi/fi/publications/effects-of-test-driven-development-a-comparative-analysis-of-empi) havaittu, tosin tutkimusasetelmat eivät ole olleet kovin vakuuttavia ja realistisia käyttötilanteita vastaavia. Niissä ei ole juurikaan otettu kantaa mahdollisiin pitkän aikavälin hyötyihin, joita ylläpidettävyydeltään laadukas koodi mahdollisesti tuottaa.

### TDD:llä on myös ikävät puolensa

Käytettäessä TDD:tä testikoodia tulee paljon, usein suunnilleen saman verran kuin varsinaista koodia. Jos ja kun sovellus muuttuu, tulee testejä myös ylläpitää, sillä monet suuremmat rakenteelliset muutokset rikkovat usein osan testeistä.

TDD:n soveltaminen on haastavaa mm. käyttöliittymä-, tietokantayhteyksistä sekä verkon yli kommunikoinnista huolehtivaa koodia tehtäessä, mahdotonta se ei kuitenkaan ole. Jo olemassa olevan koodin laajentaminen TDD:llä voi myöskin olla erittäin haastavaa erityisesti jos laajennettava koodi on rakenteeltaan vanhan liiton spagettikoodia.

## Riippuvuuksien hallinta testeissä

Testatessa on ratkaistava kysymys, miten testeissä suhtaudutaan testattavien luokkien riippuvuuksiin, eli luokkiin, joiden oliota testattava luokka käyttää.

Laskareista tuttu [riippuvuuksien injektio](/riippuvuuksien_injektointi/) -suunnittelumalli parantaa luokkien testattavuutta, sillä se mahdollistaa riippuvuuksien asettamisen luokille testistä käsin.

Yksi mahdollisuus on tehdä testejä varten riippuvuudet korvaavia tynkäkomponentteja, eli _stubeja_, näin tehtiin mm. [viikon 1 tehtävässä 16](/tehtavat1#16-nhlstatistics-ohjelman-yksikk%C3%B6testaus). Stubeihin voidaan esim. kovakoodata metodikutsujen tulokset valmiiksi. Testit voivat myös kysellä stubilta millä arvoilla testattava metodi sitä kutsui ja näin varmistaa, että testattava koodi on kommunikoinut riippuvuuksiensa kanssa oletetulla tavalla.

Tynkäkomponentteja kutsutaan niiden ominaisuuksista riippuen joko stubeiksi tai mock-olioiksi, Martin Fowlerin [artikkeli](http://martinfowler.com/articles/mocksArentStubs.html) selventää asiaa ja terminologiaa. Yleensä stubeksi kutsutaan sellaisia tynkäkomponentteja, jotka ainoastaan palauttavat kovakoodattuja metodikutsujen paluuarvoja. Mock-olioissa taas on enemmän "älyä" ja ne osaavat mm. tarkkailla onko niiden määrittelemiä metodeja kutsuttu oikeilla parametreilla ja halutun monta kertaa.

On olemassa useita kirjastoja mock-olioiden luomisen helpottamiseksi, tutustumme laskareiden Java-versiossa [Mockito](https://site.mockito.org/)-kirjastoon ja Python-versiossa [unittest-mock](https://docs.python.org/3/library/unittest.mock.html)-kirjastoon.

Tarkastellaan hieman unittest-mockin toimintalogiikkaa viikon 4 [laskareiden](/tehtavat4/) verkkokauppatehtävää esimerkkinä käyttäen.

Ostotapahtuman yhteydessä verkkokaupan tulisi veloittaa asiakkaan tililtä ostosten hinta _kutsumalla luokan pankki metodia maksa_.

```python
my_net_bank = Pankki()
viitteet = Viitegeneraattori()
kauppa = Kauppa(my_net_bank, viitteet)

kauppa.aloita_ostokset()
kauppa.lisaa_ostos(5)
kauppa.lisaa_ostos(7)

# maksetaan ostokset, samalla pitäisi tapahtua maksa
kauppa.maksa("1111")
```

Tästä koodista pitäisi siis testata, että metodikutsu `kauppa.maksa("1111")` tekee ostosten summaa vastaavan tilisiirron pankkitililtä _"1111"_ kaupan tilille.

Miten varmistamme, että tilisiirron suorittavaa luokan _Pankki_ olion metodia on kutsuttu oikeilla parametreilla?

unittest-mock-kirjastoa käyttäen tämä onnistuu seuraavasti. Luodaan testissä kaupan riippuvuuksista mock-oliot:

```python
def test_kutsutaan_pankkia_oikealla_tilinumerolla_ja_summalla(self):
    # luodaan mock-oliot
    pankki_mock = Mock()
    viitegeneraattori_mock = Mock(wraps=Viitegeneraattori())

    # injektoidaan mockit kaupalle
    kauppa = Kauppa(pankki_mock, viitegeneraattori_mock)

    kauppa.aloita_ostokset()
    kauppa.lisaa_ostos(5)
    kauppa.lisaa_ostos(5)
    kauppa.maksa("1111")

    # katsotaan, että ensimmäisen ja toisen parametrin arvo on oikea
    pankki_mock.maksa.assert_called_with("1111", 10, ANY)
```

Pankkia edustavalle mock-oliolle on asetettu metodikutsulla `assert_called_with` vaatimus, joka varmistaa että metodia _maksa_ on kutsuttu testin aikana sopivilla parametreilla. Jos tämä vaatimus ei täyty, testi ei mene läpi.

Pääset harjoittelemaan mock-kirjastojen käyttöä viikon 4 [laskareissa](/tehtavat4/).

## User storyjen testaaminen

User storyn [määritelmän](/osa2#user-story) yhteydessä mainittiin, että user storyn käsite pitää sisällään _hyväksymiskriteerit_, Mike Cohnin sanoin:

> _tests that convey and document details and that will be used to determine that the story is complete_

Esimerkiksi user storyn _asiakas voi lisätä tuotteen ostoskoriin_ hyväksymiskriteerejä voisivat olla

- ollessaan tuotelistauksessa ja valitessaan tuotteen jota on varastossa, menee tuote ostoskoriin ja ostoskorin hinta sekä korissa olevien tuotteiden määrä päivittyy oikein
- ollessaan tuotelistauksessa ja valitessaan tuotteen jota ei ole varastossa, pysyy ostoskorin tilanne muuttumattomana

Optimaalisessa tilanteessa user storyjen hyväksymiskriteereistä saadaan muodostettua suurin osa ohjelmiston järjestelmätason, eli käyttäjän näkökulmasta sovelluksen toiminnallisuuden varmistavista toiminnallisista testeistä.

Storyn hyväksymiskriteerit on tarkoituksenmukaista kirjoittaa heti storyn toteuttavan sprintin alussa, mielellään yhteistyössä kehitystiimin ja product ownerin tai jonkun muun asiakkaan edustajan kesken. Usein käytäntönä on ilmaista hyväksymiskriteerit user storyjen tapaan asiakkaan kielellä, käyttämättä teknistä jargonia. Hyväksymiskriteerien kirjoitusprosessi lisääkin parhaassa tapauksessa asiakkaan ja tiimin välistä kommunikaatiota.

### Järjestelmätestauksen automatisointi, ATDD ja BDD

Ideaalitilanteessa storyjen hyväksymiskriteereistä tehdään automaattisesti suoritettavia.

Automaattisen hyväksymistestauksen on olemassa monia työkaluja, eräs suosituimmista on suomalainen Python-pohjainen [Robot framework](https://robotframework.org/).

Automatisoidusta hyväksymistestauksesta käytetään joskus nimitystä [Acceptance test driven development](https://en.wikipedia.org/wiki/Acceptance_test%E2%80%93driven_developmen) (ATDD) tai _[Behavior driven development](https://en.wikipedia.org/wiki/Behavior-driven_development)_ (BDD), erityisesti jos testit toteutetaan jo iteraation alkupuolella, ennen kun storyn toteuttava koodi on valmiina.

ATDD:ssä ja BDD:ssä on kyse lähes samasta asiasta pienin painotuseroin. BDD kiinnittää tarkemmin huomiota käytettävään terminologiaan, BDD ei esimerkiksi puhu ollenkaan testeistä vaan sen sijaan kuvailee hyväksymiskriteerit esimerkkikäyttäytymisten (example behavior) avulla.

Käsite ATDD pitää sisällään aina ainoastaan hyväksymistason testauksen. BDD:llä voidaan tehdä myös muita, kuin hyväksymistason testejä. Rubylle alun perin kehitetty [RSpec](https://rspec.info/) sanoo olevansa BDD-kirjasto, RSpec sopii hyväksymistestien lisäksi hyvin myös yksikkötestaamiseen. Muille kielille on tehty paljon rspecin tapaan toimivia BDD-henkisiä kirjastoja, kuten JavaScript-maailman [Mocha](https://mochajs.org/) ja [Jest](https://jestjs.io/). Kohta käsiteltävä Cucumber on kuitenkin nimenomaan hyväksymistestaukseen työväline. Yksikkötestaamiseen sitä ei kannata käyttää.

### Cucumber

Kuten useimmissa hyväksymistason testauksen työkaluissa, myös Cucumberia käytettäessä testit kirjoitetaan asiakkaan kielellä.

Tarkastellaan esimerkkinä käyttäjätunnuksen luomisen ja sisäänkirjautumisen tarjoamaa palvelua.

Palvelun vaatimuksen määrittelevät user storyt

- _a new user account can be created if a proper unused username and a proper password are given_
- _user can log in with a valid username/password-combination_

Cucumberissa jokaisesta user storysta kirjoitetaan oma _.feature_-päätteinen tiedosto, joka sisältää storyn nimen ja joukon storyyn liittyvä hyväksymiskriteereitä, joita Cucumber kutsuu _skenaarioiksi_. Storyn hyväksymiskriteerit eli skenaariot kirjoitetaan [Gherkin](https://cucumber.io/docs/gherkin/reference/)-kielellä, seuraavassa muodossa

_Given [initial context], when [event occurs], then [ensure some outcomes]_

Esimerkkimme ensimmäinen user story hyväksymiskriteereineen kirjoitettaisiin seuraavasti:

![]({{ "/images/3-9.png" | absolute_url }}){:height="450px" }

Skenaariot muutetaan automaattisesti suoritettaviksi testeiksi kirjoittamalla niistä mäppäys ohjelmakoodiin. Ohjelmoijat tekevät mäppäyksen siinä vaiheessa, kun tuotantokoodia on tarpeellinen määrä valmiina.

Käytännössä jokaista testin _given_, _when_ ja _then_-askelta vastaa oma metodinsa.
Metodit kutsuvat ohjelman luokkia simuloiden käyttäjän syötettä varmistaen, että ohjelma reagoi käyttäjän toimiin halutulla tavalla.

![]({{ "/images/3-10a.png" | absolute_url }}){:height="500px" }

### Web-sovellusten testauksen automatisointi

Olemme jo nähneet ensimmäisen ja toisen viikon laskareissa, miten riippuvuuksien injektoinnin avulla on helppo tehdä komentoriviltä toimivista ohjelmista automatisoidusti testattavia. Myös Java Swing, JavaFX ja muilla käyttöliittymäkirjastoilla sekä web-selaimella käytettävien sovellusten automatisoitu testaaminen on mahdollista. Tutustumme laskareissa web-sovellusten testauksen automatisointiin käytettävään [Selenium 2.0 WebDriver](http://seleniumhq.org/docs/03_webdriver.html) -kirjastoon.

Selenium tarjoaa rajapinnan, jonka avulla on mahdollisuus simuloida ohjelmakoodista tai testeistä käsin selaimen toimintaa, esim. linkkien klikkaamista ja tiedon syöttämistä lomakkeeseen. Selenium Webdriver -rajapinta on käytettävissä lähes kaikilla ohjelmointikielillä.

Seleniumia käyttävät testit voi tehdä normaalin testikoodin tapaan unittest-kirjastolla seuraavaksi esiteltävän Robot Frameworkin avulla.

Seuraavassa esimerkki käyttäjätunnuksista ja sisäänkirjautumisesta huolehtivan järjestelmän web-version testien mäppäyksestä:

![]({{ "/images/3-11a.png" | absolute_url }}){:height="500px" }

### Robot Framework

Robot on toimintaperiaatteiltaan hyvin samankaltainen kuin Cucumber. Myös Robot-testit kirjoitetaan asiakkaan kielellä.

User storya _user can log in with a valid username/password-combination_ vastaavat hyväksymäkriteerit ilmaistaisiin Robotissa seuraavasti (sovelluksen komentoriviversiolle):

```
Login With Correct Credentials
    Input Login Command
    Input Credentials  kalle  kalle123
    Output Should Contain  Logged in

Login With Incorrect Password
    Input Login Command
    Input Credentials  kalle  wrong
    Output Should Contain  Invalid username or password

Login With Nonexistent Username
    Input Login Command
    Input Credentials  ville  wrong
    Output Should Contain  Invalid username or password
```

Testitapausten askeleet koostuvat _avainsanoista_ sekä niille annettavista parametreistä. Esimerkissä _Input Login Command_, _Input Credentials_ ja _Output Should Contain_ ovat avainsanoja. Avainsanojen merkitys tulee määritellä, joko "yksinkertaisempien" avainsanojen avulla tai koodina. Seuraavassa avainsanojen _Input Login Command_ ja _Input Credentials_ määrittelyt:

```
Input Login Command
    Input  login

Input Credentials
    [Arguments]  ${username}  ${password}
    Input  ${username}
    Input  ${password}
    Run Application
```

Jäljelle jäävät avainsanat _Input_, _Run Application_ ja _Output Should Contain_ on määriteltävä suoraan koodin tasolla, jotta testien suorittaminen olisi mahdollista (detaljit eivät ole nyt tärkeitä, pääset tutustumaan niihin laskareissa):

```python
class AppLibrary:
    def __init__(self):
        self._io = StubIO()
        self._user_repository = UserRepository()
        self._user_service = UserService(self._user_repository)

        self._app = App(
            self._user_service,
            self._io
        )

    def input(self, value):
        self._io.add_input(value)

    def output_should_contain(self, value):
        outputs = self._io.outputs

        if not value in outputs:
            raise AssertionError(
                f"Output \"{value}\" is not in {str(outputs)}"
            )

    def run_application(self):
        self._app.run()
```

Web-sovellusten testaaminen Robotilla on erittäin helppoa. Robot hyödyntää Seleniumia ja sisältää runsaasti [valmiiksi määriteltyjä avainsanoja](https://robotframework.org/SeleniumLibrary/SeleniumLibrary.html), joten web-sovelluksia testattaessa avainsanojen toiminnan määrittelevää koodia ei yleensä ole tarvetta kirjoittaa läheskään yhtä paljoa kuin Cucumberissa.

Edellä olleen esimerkin web-version hyväksymäkriteerit Robotilla määriteltynä näyttäisivät seuraavalta:

```
Login With Correct Credentials
    Go To Login Page
    Set Username  kalle
    Set Password  kalle123
    Submit Credentials
    Login Should Succeed

Login With Incorrect Password
    Go To Login Page
    Set Username  kalle
    Set Password  kalle456
    Submit Credentials
    Login Should Fail With Message  Invalid username or password

Login With Nonexistent Username
    Go To Login Page
    Set Username  palle
    Set Password  kalle456
    Submit Credentials
    Login Should Fail With Message  Invalid username or password
```

Testien käyttämät avainsanat on määritelty seuraavasti Robotin valmiiksi määriteltyjen avainsanojen avulla:

```
Go To Login Page
    Go To  ${LOGIN URL}

Set Username
    [Arguments]  ${username}
    Input Text  username  ${username}

Set Password
    [Arguments]  ${password}
    Input Password  password  ${password}

Submit Credentials
    Click Button  Login

Login Should Fail With Message
    [Arguments]  ${message}
    Login Page Should Be Open
    Page Should Contain  ${message}
```

Koska testien käyttämät avainsanat on määritelty käyttämällä ainoastaan Robotin valmiiksi määriteltyjä avainsanoja kuten _Input Text_, _Click Button_ ja _Page Should Contain_, ei testien toimintaan saattaminen edellytä muuta kuin muutaman rivin konfiguraatiota.

Robot Frameworkia pääset käyttämään viikon 3 laskarien [Python-versiossa](/tehtavat3).

## Ohjelmiston integraatio

Vesiputousmallissa eli lineaarisesti etenevässä ohjelmistotuotannossa ohjelmiston toteutusvaiheen päättää integraatiovaihe, jonka aikana yksittäin testatut komponentit integroidaan yhdessä toimivaksi kokonaisuudeksi sekä suoritetaan integraatiotestaus, joka varmistaa komponenttien yhteistoiminnallisuuden.

Perinteisesti juuri integraatiovaihe on tuonut esiin suuren joukon ongelmia. Tarkasta etukäteissuunnittelusta huolimatta erillisten tiimien toteuttamat komponentit ovat kuitenkin olleet rajapinnoiltaan tai toiminnallisuuksiltaan epäyhteensopivia.

Suurten projektien integraatiovaihe on kestänyt ennakoimattoman kauan, ja integraation aikana havaitut ongelmat ovat saattaneet aiheuttaa suuriakin suunnitteluun tai jopa vaatimusmäärittelyyn tarvittavia muutoksia.

Integraatio on ollut perinteisesti niin ikävä ja hankala vaihe, että sitä kuvaamaan on lanseerattu termi [integraatiohelvetti](http://wiki.c2.com/?IntegrationHell).

### Daily build ja smoke test

90-luvulla alettiin huomaamaan, että riskien minimoimiseksi integraatio kannattaa tehdä useammin kuin vain projektin lopussa. Parhaaksi käytänteeksi alkoi muodostua päivittäin tehtävä koko projektin kääntäminen eli _daily build_ ja samassa yhteydessä suoritettava _smoke test_. Nämä käytänteet alkoivat nousta suurempaan tietoisuuteen 90-luvun puolivälissä erityisesti [Microsoftin](https://stevemcconnell.com/articles/daily-build-and-smoke-test/) Excel- ja Windows 95 -tiimien menestysten ansiosta.

Smoke testillä tarkoitetaan kohtuullisen yksinkertaista järjestelmätason testiä, joka kuitenkin testaa järjestelmän kaikkia arkkitehtuurillisia tasoja (käyttöliittymää, sovelluslogiikkaa, tietokantaa), ja havaitsee jos jotain on pahasti pielessä. Smoke test ei siis kata kovin paljoa sovelluksen toiminnallisuudesta, mutta kuitenkin riittävästi havaitakseen jos sovellus hajoaa perustavanlaatuisella tavalla, esimerkiksi jos sovelluslogiikan ja tietokannan välille syntyy epäyhteensopivuus, joka estää kokonaan tietokantayhteyksien muodostamisen.

Daily buildia ja smoke testiä käytettäessä järjestelmän integraatio tehdään ainakin jollain tarkkuustasolla joka päivä. Komponenttien yhteensopivuusongelmat huomataan nopeasti ja niiden korjaaminen helpottuu. Tiimin moraali myös paranee, kun ohjelmistosta on olemassa päivittäin kasvava ainakin jossain määrin toimiva versio.

### Jatkuva integraatio

Kerran päivässä tapahtuva integraatiovaihe todettiin hyväksi käytännöksi. Extreme programming -yhteisö kehitti 90-luvun loppupuolella ideaa vielä pidemmälle ja päätyi edelleen tihentämään integraatiosykliä. Näin syntyi _jatkuva integraatio_ eli [continuous integration](https://martinfowler.com/articles/continuousIntegration.html) (CI).

Jatkuvaa integraatiota käytettäessä ohjelmakoodi, ohjelman käyttämien kirjastojen konfiguraatiot, automatisoidut testit sekä ohjelmiston kääntämisestä ja testaamisesta huolehtivat "build skriptit" (kuten _build.gradle_- tai _pyproject.toml_-tiedosto) pidetään keskitetyssä versionhallintarepositoriossa.

Yksittäinen palvelin, jonka konfiguraatio vastaa mahdollisimman läheisesti tuotantopalvelimen konfiguraatiota, varataan CI-palvelimeksi. Kun keskitetyssä repositoriossa olevaan koodiin tulee muutoksia, CI-palvelin hakee ohjelmiston koodin, kääntää sen sekä suorittaa sille testit. Jos koodi ei käänny tai testit eivät mene läpi, CI-palvelin kertoo ongelmista kehittäjätiimille, ja ongelmiin on tarkoitus puuttua **välittömästi**.

Sovelluskehittäjän työskentely jatkuvaa integraatiota käytettäessä etenee seuraavasti.

Aloittaessaan uuden ominaisuuden toteuttamisen, kehittäjä hakee versionhallinnasta koodin ajantasaisen version. Kehittäjä toteuttaa työn alla olevan ominaisuuden, tekee sille automatisoidut testit ja integroi sen muuhun koodiin. Kun kaikki on valmiina, ja testit menevät läpi paikallisesti, pushaa kehittäjä koodin versionhallintaan.

CI-palvelin huomaa tehdyt muutokset, hakee koodit ja suorittaa testit. Näin minimoituu mahdollisuus sille, että lisätty koodi toimii esimerkiksi konfiguraatioerojen takia ainoastaan kehittäjän omalla koneella.

Jatkuvan integraation tarkoituksena on siis se, että _jokainen kehittäjä integroi tekemänsä työn muuhun koodiin mahdollisimman usein, vähintään kerran päivässä_. CI siis rohkaisee jakamaan työn pieniin osiin, sellaisiin jotka saadaan testeineen "valmiiksi" yhden työpäivän aikana. Jatkuvan integraation soveltaminen vaatiikin suurta kurinalaisuutta.

Täydellisenä kontrastina vesiputousmaailman integraatiohelvettiin, jatkuvan integraation pyrkimyksenä on tehdä ohjelmiston integraatiosta täysin vaivaton operaatio, joka takaa sen että ohjelmistosta on koko ajan saatavilla ajantasainen, kokonaisuudessaan integroitu ja testattu versio.

Jotta CI-prosessi toimisi riittävän jouhevasti, tulee testien suorittamisen tapahtua suhteellisen nopeasti. Maagisena rajana pidetään usein kymmentä minuuttia. Erityisesti käyttöliittymän läpi suoritettavat end to end -testit voivat kuitenkin olla yllättävän aikaa vieviä. Jos testien suoritusaika alkaa kasvaa liikaa, voidaan testit konfiguroida ajettavaksi _kahdessa vaiheessa_. Testien ensimmäisen vaiheen _commit buildin_ läpimeno antaa kehittäjälle riittävän varmuuden pushata uusi koodi versionhallintaan. CI-palvelimella suoritetaan sitten myös hitaammat testit sisältävä _secondary build_.

Monimutkaisemmissa tilanteissa testaus voidaan jakaa vieläkin useampaan vaiheeseen. Sovellukselle saatetaan tehdä esim. suuren kuormituksen sietoa mittaavia testejä, joiden suorituksessa kestää useita tunteja. Tällaisia testejä ei ole missään nimessä tarkoituksenmukaista suorittaa jokaisen versionhallintaan tapahtuvan koodin muutoksen (eli commitin) yhteydessä, vaan esimerkiksi kerran vuorokaudessa.

Ensimmäisen viikon laskareissa käytetty [GitHub Actions](https://github.com/features/actions) on tällä hetkellä kovimmassa nosteessa oleva SaaS-palveluna eli pilvessä toimiva CI-ratkaisu. Hieman vanhempia, mutta edelleen käyttökelpoisia vaihtoehtoja ovat [CircleCI](https://circleci.com) ja [Travis](https://travis-ci.org/). Eräs SaaS-palveluina toimivien CI-ratkaisujen suurista eduista on se, että tarvetta oman CI-palvelimen asentamiselle ja ylläpitämiselle ei ole.

GitHub Actionsia, CircleCI:tä ja Travisia paljon vanhempi [Jenkins](https://jenkins.io/) lienee edelleen maailmalla eniten käytetty CI-palvelinohjelmisto. Tällä hetkellä ei kuitenkaan ole yhtään ilmaista internetissä palveluna toimivaa Jenkins-palvelua. Jenkinsin käyttö siis edellyttää sen asentamista omalle palvelimelle. Vaikka Jenkins on suosittu ja sillä voi tehdä melkein mitä tahansa, on se kuitenkin aika vanhan liiton ohjelmisto verrattuna uudempiin tulokkaisiin.

### Jatkuvan integraation määritelmä

Palataan vielä siihen mitä jatkuva integraatio menetelmän [pioneerien](https://martinfowler.com/articles/continuousIntegration.html) mukaan oikeastaan tarkoittaa. Jatkuvan integraation tekemiseen _ei riitä_ että joku on konfiguroinut tiimille CI-palvelimen. Jotta tiimin voidaan sanoa tekevän jatkuvaa integraatiota, tulee sovelluskehittäjien todellakin synkronoida tekemänsä koodi mahdollisimman usein (vähintään päivittäin) yhteisen keskitetyn repositorion koodin kanssa. Tämä taas tarkoittaa sitä, että esimerkiksi jokaisen aamun alussa kaikilla sovelluskehittäjillä tulisi olla päivän työnsä lähtökohtana _sama koodi_. Kuten jokainen tiimissä sovelluskehitystä tehnyt tietää, kaikkien koodin synkronointi päivittäisellä tasolla ei välttämättä ole helppoa ja se vaatii systemaattista ja kurinalaista työskentelyä.

Nykyään monin paikoin käytössä oleva tapa käyttää useiden päivien tai jopa viikkojen ikäisiä [feature branchejä](https://martinfowler.com/bliki/FeatureBranch.html), eli jokaiselle uudelle toiminnallisuudelle tarkoitettuja omia versionhallinnan haaroja tarkoittaa oikeastaan jo lähtökohtaisesti sitä, että tiimi [ei harjoita jatkuvaa integraatiota](https://www.innoq.com/en/blog/continuous-integration-contradicts-feature-branches/). Palaamme asiaan [myöhemmin](/osa3/#feature-branchit-ja-merge-hell) tässä osassa.

## Jatkuva toimittaminen ja toimitusvalmius

Viime aikoina nousseen trendin mukaan jatkuvaa integraatiota on ruvettu viemään vielä muutama askel pidemmälle ja integraatioprosessiin on enenevissä määrin ruvettu lisäämään myös automaattinen "deployaus", eli käännetty ja testattu koodi siirretään automatisoidusti suoritettavaksi ns. _staging_- eli testipalvelimelle.

Staging-palvelin on ympäristö, joka on konfiguraatioidensa sekä myös sovelluksessa käsiteltävän datan (käytännössä siis tietokannan sisällön) osalta mahdollisimman lähellä varsinaista tuotantoympäristöä. Kun ohjelmiston uusi versio on viety eli deployattu staging-palvelimelle, suoritetaan sille hyväksymistestaus. Nämä testit ovat lähinnä järjestelmätason testejä, jotka varmistavat, että sovellus toimii käyttäjän haluamalla tavalla mahdollisimman tuotannon kaltaisessa ympäristössä.

Hyväksymistestauksen jälkeen uusi versio voidaan siirtää tuotantopalvelimelle, eli loppukäyttäjien käyttöön. Parhaassa tapauksessa myös staging-ympäristössä tehtävien hyväksymistestien suoritus on automatisoitu, ja ohjelmisto kulkee koko _deployment pipelinen_ läpi, eli sovelluskehittäjän koneelta CI-palvelimelle, sieltä staging-ympäristöön ja lopulta tuotantoon, automaattisesti.

Termillä _deployment pipeline_ tarkoitetaan niitä ohjelman käännöksen, testauksen ja muun laadunhallinnan vaiheita, joiden läpikäymistä edellytetään, että ohjelma saadaan siirrettyä tuotantoympäristöön loppukäyttäjien käyttöön.

Jokainen sovelluskehittäjän commit kulkee deployment pipelinen eli käsitteellisen "liukuhihnan" läpi

- CI-palvelin suorittaa commitille joukon testejä ja mahdollisesti staattista analyysiä
- seuraavassa vaiheessa commitin aikaansaama sovelluksen uusi versio siirtyy staging-ympäristöön
- staging-ympäristössä sovelluksen uudelle versiolle suoritetaan lisää testejä
- lopulta commit siirtyy tuotantoympäristöön

![]({{ "/images/3-12.png" | absolute_url }}){:height="280px" }

Käytännöstä, jossa jokainen CI:n läpäisevä ohjelmiston commit, eli versionhallintaan pushattu versio viedään automatisoidusti staging-palvelimelle ja siellä tapahtuvan automatisoidun hyväksymistestauksen jälkeen tuotantoon, nimitetään _jatkuvaksi toimittamiseksi_ (engl. continuous deployment).

On olemassa tilanteita, missä jokaista commitia ei haluta viedä automaattisesti tuotantoon. Jos viimeinen vaihe, eli tuotantoon vieminen tapahtuukin ainoastaan ihmisen toimesta "nappia painamalla", puhutaan _jatkuvasta toimitusvalmiudesta_, (engl. continuous delivery).

Viime aikoina on erityisesti suuren kokoluokan web-palveluissa (esim. Google, Amazon, Netflix, Facebook) ruvettu suosimaan tyyliä, jossa ohjelmistosta julkaistaan uusi versio tuotantoon jopa [kymmeniä tai satoja](https://dzone.com/articles/release-frequency-a-need-for-speed) kertoja päivästä. Suomessa tätä käytäntöä harjoittaa mm. monia TKT:n opiskelijoitakin työllistävä [Smartly](https://www.smartly.io/).

## Tutkiva testaaminen

Jotta järjestelmä saadaan niin virheettömäksi, että se voidaan laittaa tuotantoon, on testaus suoritettava erittäin perusteellisesti. Perinteinen tapa järjestelmätestauksen suorittamiseen on perustunut ennen testausta laadittuun perinpohjaiseen testaussuunnitelmaan. Jokaisesta testistä on kirjattu testisyötteet ja odotettu tulos. Testauksen tuloksen kontrolloiminen on suoritettu vertaamalla järjestelmän toimintaa testitapaukseen kirjattuun odotettuun tulokseen.

Automatisoitujen hyväksymistestien luonne on täsmälleen samanlainen, jokaisen testin syötteet sekä odotetut tulokset ovat tarkkaan etukäteen kiinnitettyjä. Jos testaus tapahtuu pelkästään etukäteen mietittyjen testien avulla, ovat ne kuinka tahansa tarkkaan harkittuja, ei kaikkia yllättäviä tilanteita osata ennakoida.

Hyvät testaajat ovat kautta aikojen tehneet "virallisen" dokumentoidun testauksen lisäksi epävirallista "ad hoc"-testausta. Viime vuosina "ad hoc"-testaus on saanut virallisen aseman ja sen strukturoitua muotoa on ruvettu kutsumaan nimellä _tutkiva testaaminen_ (engl. exploratory testing).

Käsitteen kehittäjä [Cam Kaner](http://www.satisfice.com/articles/what_is_et.shtml) määrittelee termin seuraavasti

> _exploratory testing is simultaneous learning, test design and test execution_

Ideana on, että testaaja ohjaa toimintaansa suorittamiensa testien ohjelmassa aiheuttaman reaktion perusteella. Testitapauksia ei suunnitella kattavasti etukäteen, sen sijaan testaaja pyrkii kokemuksensa ja suorittamiensa testien ja kokeilujen perusteella löytämään järjestelmästä virheitä.

Tutkiva testaus ei kuitenkaan etene täysin sattumanvaraisesti, kullekin testisessiolle asetetaan jonkinlainen tavoite, eli mitä osaa tai toiminnallisuuksia sovelluksesta on tarkoitus tutkia ja minkälaisia virheitä tarkoitus etsiä.

Ketterässä ohjelmistotuotannossa tavoite voi hyvin jäsentyä yhden tai useamman user storyn määrittelemän toiminnallisuuden ympärille. Esimerkiksi verkkokaupassa voitaisiin testata ostosten lisäystä ja poistoa ostoskorista.

Tutkivassa testauksessa keskeistä on kaikkien testattavassa ohjelmistossa tapahtuvien seikkojen havainnointi. Normaaleissa etukäteen määritellyissä testeissähän havainnoidaan ainoastaan reagoiko järjestelmä odotetulla, ennakkoon määritellyllä tavalla. Tutkivassa testaamisessa kiinnitetään huomio myös varsinaisen testattavan toiminnallisuuden ulkopuolisiin asioihin.

Esimerkiksi jos huomattaisiin selaimen osoiterivillä URL
https://www.verkkokauppa.com/ostoskori?id=10 voitaisiin yrittää muuttaa käsin ostoskorin id:tä ja yrittää saada järjestelmä epästabiiliin tilaan.

Tutkivan testaamisen avulla löydettyjen virheiden toistuminen jatkossa kannattaa eliminoida lisäämällä ohjelmalle sopivat automaattiset regressiotestit. Tutkivaa testaamista ei siis kannata käyttää regressiotestauksen menetelmänä, vaan sen avulla kannattaa ensisijaisesti testata sprintin yhteydessä toteutettuja uusia ominaisuuksia.

Tutkiva testaaminen siis ei missään tapauksessa ole vaihtoehto normaaleille tarkkaan etukäteen määritellyille ja automatisoiduille testeille, vaan niitä täydentävä testauksen muoto.

## Tuotannossa tapahtuva testaaminen ja laadunhallinta

Perinteisesti on ajateltu, että ohjelmiston laadunhallintaan liittyvä testaus tulee suorittaa ennen kuin ohjelmisto tai sen uudet toiminnallisuudet on otettu käyttöön eli viety tuotantoympäristöön. Viime aikoina erityisesti web-sovellusten kehityksessä on noussut esiin suuntaus, missä osa laadunhallinnasta tapahtuu monitoroimalla tuotannossa olevaa ohjelmistoa.

![]({{ "/images/3-13.png" | absolute_url }}){:height="330px" }

### Blue-green-deployment

Eräs tuotannossa tapahtuvan testaamisen tekniikka on [blue-green-deployment](https://martinfowler.com/bliki/BlueGreenDeployment.html), missä periaatteena on ylläpitää rinnakkain kahta tuotantoympäristöä (tai palvelinta), joista käytetään usein nimiä blue ja green.

Tuotantoympäristöistä vain toinen on ohjelmiston käyttäjien aktiivisessa käytössä. Käyttäjien ja tuotantopalvelinten välissä oleva komponentti, esimerkiksi ns. reverse proxyna toimiva web-palvelin (kuvassa router) ohjaa käyttäjien liikenteen aktiivisena olevaan ympäristöön.

Kun järjestelmään toteutetaan uusi ominaisuus, deployataan se ensin passiivisena olevaan ympäristöön.

![]({{ "/images/3-14.png" | absolute_url }}){:height="220px" }

Passiiviselle, uuden ominaisuuden sisältämälle ympäristölle voidaan sitten tehdä erilaisia testejä, esim. osa käyttäjien liikenteestä voidaan ohjata aktiivisen lisäksi passiiviseen ympäristöön ja varmistaa, että se toimii odotetulla tavalla.

Kun uuden ominaisuuden sisältävän passiivinen ympäristön todetaan toimivan ongelmattomasti, voidaan palvelinten rooli vaihtaa ja uuden ominaisuuden sisältämästä palvelimesta tulee uusi aktiivinen tuotantoympäristö. Aktiivisen tuotantoympäristön vaihto tapahtuu määrittelemällä reverse proxyna toimiva web-palvelin ohjaamaan liikenne uudelle palvelimelle.

Jos uuden ominaisuuden sisältävässä versiossa havaitaan aktivoinnin jälkeen jotain ongelmia, on mahdollista suorittaa erittäin nopeasti _rollback-operaatio_, eli vaihtaa vanha versio jälleen aktiiviseksi.

On tarkoituksenmukaista, että kaikki blue-green-deploymentiin liittyvät testit, niiden tulosten varmistaminen, tuotantoympäristön vaihto ja mahdollinen rollback tapahtuvat automatisoidusti.

### Canary release

Blue-green-deploymentin hieman pidemmälle viedyssä versiossa [canary-releasessa](https://martinfowler.com/bliki/CanaryRelease.html) uuden ominaisuuden sisältävään ympäristöön ohjataan osa, esim. 5% järjestelmän käyttäjistä:

![]({{ "/images/3-15.png" | absolute_url }}){:height="220px" }

Uuden ominaisuuden sisältämää versiota monitoroidaan aktiivisesti ja jos ongelmia ei ilmene, vähitellen kaikki liikenne ohjataan uuteen versioon. Kuten blue-green-deploymentin tapauksessa, ongelmatilanteissa palautetaan käyttäjät aiempaan, toimivaksi todettuun versioon.

Uuden version toimivaksi varmistaminen siis perustuu _järjestelmän monitorointiin_. Jos kyseessä olisi esim. sosiaalisen median palvelu, monitoroinnissa voitaisiin tarkastella esim.:

- palvelun muistin ja prosessoriajan kulutusta sekä verkkoliikenteen määrää
- sovelluksen eri sivujen vasteaikoja eli latautumiseen menevää aikaa
- kirjautuneiden käyttäjien määrää
- luettujen ja lähetettyjen viestien määriä per käyttäjä
- kirjautuneen käyttäjän sovelluksessa viettämää aikaa

Monitoroinnissa tulee siis palvelimen yleisen toimivuuden lisäksi seurata
_käyttäjätason metriikoita_ (engl. business level metrics). Jos niissä huomataan eroavuuksia aiempaan, esim. kirjautuneet käyttäjät eivät lähetä keskimäärin samaa määrää viestejä kuin aiemmin, voidaan olettaa, että sovelluksen uudessa versiossa saattaa olla joku ongelma. Tälläisessä tilanteessa saatetaan tehdä rollback vanhaan versioon ja analysoida vikaa tarkemmin.

Myös canary releasejen yhteydessä testauksen ja kaiken tuotantoon vientiin liittyvän on syytä tapahtua automatisoidusti.

Nimi canary release periytyy kaivostyöläisten tavasta käyttää kanarialintuja tutkimaan sitä onko kaivoksessa myrkyllisiä kaasuja: jos kaivokseen viety lintu ei kuole, ilma on turvallista.

### Tuotannossa testaaminen ja tietokanta

Edellisissä kuvissa oli merkitty järjestelmän vanhalle ja uudelle versiolle erillinen tietokantapalvelin (database server).

Tilanne ei välttämättä ole tämä ja erityisesti canary releasejen yhteydessä järjestelmän molemmat versiot käyttävät yleensä samaa tietokantaa:

![]({{ "/images/3-16.png" | absolute_url }}){:height="200px" }

Tämä taas asettaa haasteita, jos järjestelmään toteutetut uudet ominaisuudet edellyttävät muutoksia tietokannan skeemaan, sillä canary releasejen yhteydessä tarvitaan usein yhtä aikaa sekä tietokannan uutta että vanhaa versiota.

Jos järjestelmän uusi ja vanha versio joutuvat jostain syystä käyttämään eri tietokantaa, täytyy kantojen tila synkronoida, jotta järjestelmien vaihtaminen onnistuu saumattomasti. Yhteen kantaan sovelluksen tekemät päivitykset on siis tavalla tai toisella tehtävä myös toiseen, kenties skeemaltaan jo muuttuneeseen kantaan.

### Feature toggle

Canary releasea havainnollistavassa kuvassa järjestelmän uusi ja vanha versio näytettiin erillisinä palvelimina. Sama voidaan toteuttaa myös käyttäen yksittäistä palvelinta ns. [feature toggleja](https://martinfowler.com/articles/feature-toggles.html) hyödyntämällä. Sama asia kulkee myös nimillä feature flag, conditional feature ja config flag. Nimi feature toggle alkaa kuitenkin vakiintua.

Feature togglejen periaate on erittäin yksinkertainen. Koodiin laitetaan ehtolauseita, joiden avulla osa liikenteestä ohjataan vanhan toteutuksen sijaan uuteen laadunhallinnan alla olevaan toteutukseen.

Esimerkiksi sosiaalisen median palvelussa voitaisiin käyttäjälle näytettävien uutisten listaan asettaa feature toggle, jonka avulla tietyin perustein valituille käyttäjille näytettäisiinkin uuden algoritmin perusteella generoitu lista uutisia:

```python
def recommended_news_generator(user):
    if is_in_canary_release(user):
        return experimental_recommendation_algorithm(user)
    else:
        return recommendation_algoritm(user)
```

Osassa 2 [Lean-startup](osa2/#vaatimusmäärittely-2010-luvulla)-menetelmän yhteydessä mainittu A/B-testaus toteutetaan yleensä feature togglejen avulla.

Canary releaset ja A/B-testaus eivät ole feature togglejen ainoa sovellus, niitä käytetään
yleisesti myös eliminoimaan tarve pitkäikäisille _feature brancheille_. Eli sen sijaan, että uusia ominaisuuksia toteutetaan erilliseen versionhallinnan haaraan, joka ominaisuuksien valmistumisen yhteydessä mergetään pääkehityshaaraan, uudet ominaisuudet tehdään suoraan pääkehityshaaraan, mutta ne piilotetaan käyttäjiltä feature toggleilla.

Käytännössä feature toggle siis palauttaa aina vanhan version normaaleille käyttäjille. Sovelluskehittäjien ja testaajien taas on mahdollista valita, kumman version feature toggle palauttaa. Kun ominaisuus on valmis testattavaksi laajemmalla joukolla, on ominaisuus mahdollista julkaista feature togglen avulla esim. kehittäjäyrityksen omaan käyttöön ja lopulta osalle käyttäjistä canary releasena. Lopulta feature toggle ja vanha toteutus voidaan poistaa koodista.

Suuret internetpalvelut kuten Facebook, Netflix, Google ja Flickr soveltavat laajalti canary releaseihin ja feature toggleihin perustuvaa kehitysmallia.

### Feature branchit ja merge hell

Edellisessä luvussa mainittiin [feature branchit](https://www.atlassian.com/git/tutorials/comparing-workflows/feature-branch-workflow). Kyseessä on siis käytäntö, missä uudet ominaisuudet, esimerkiksi user storyn vaatima toiminnallisuus toteutetaan ensin omaan versionhallinnan haaraansa (branch) ja ominaisuuden valmistuttua haara mergetään pääkehityshaaraan (esim. masteriin).

Monet pitävät feature brancheja versionhallinnan käytön best practicena. Viime aikoina on kuitenkin monissa piireissä ruvettu pitämään feature branchaystä ikävänä käytänteenä, sillä se johtaa helposti pahoihin merge-konflikteihin, erityisesti jos branchit ovat pitkäikäisiä.

Seurauksena pienimuotoinen integraatiohelvetti, _merge hell_ ja kehitystiimin normipäivä erityisesti sprintin lopussa alkaa muistuttaa seuraavaa

![]({{ "/images/3-18.png" | absolute_url }}){:height="80px" }

Viime aikaisena suuntauksena on noussut esiin [trunk based development](https://trunkbaseddevelopment.com/) missä pitkäikäisiä feature brancheja ei käytetä ollenkaan.

Kaikki muutokset tehdään suoraan pääkehityshaaraan, josta käytetään nimitystä _trunk_. Pääkehityshaara voi olla master tai joku erillinen branch käytännöistä riippuen. Ohjelmiston kustakin julkaistusta versiosta saatetaan tarvittaessa tehdä oma _release branch_.

Trunk-pohjainen kehitys pakottaa sovelluskehittäjät tekemään pieniä, nopeasti päähaaraan mergettäviä muutoksia. Trunk-pohjainen kehitys yhdistetään usein feature toggleihin. Näin puolivalmiina olevia ominaisuuksia voidaan helposti ohjelmoida suoraan päähaaraan ja viedä tuotantoympäristöön ilman sovelluksen olemassa olevan toiminnallisuuden sotkemista.

Trunk-pohjainen kehitysmalli edellyttää sovelluskehittäjiltä erityisen suurta kuria ja systemaattisuutta. Feature brancheihin perustuva työskentely onkin aloittelijoiden tai vähemmän kurinalaisten kehittäjien kanssa turvallisempi toimintatapa kaikista ongelmistaan huolimatta.
Feature togglejen holtiton käyttö voi johtaa feature toggle -helvettiin, eli suunnittelua ja systemaattisuutta todellakin tarvitaan.

Trunk-pohjaista kehitysmallia noudattavat monet maailman suurimmista internetpalveluista, esim. Google, Facebook ja Netflix.

## DevOps

Jatkuvan toimitusvalmiuden (Continuous delivery), jatkuvan toimittamisen (Continuous deployment) ja tuotannossa testaamisen soveltaminen ei useimmiten ole ollenkaan suoraviivaista.

Perinteisesti yrityksissä on ollut tarkka erottelu sovelluskehittäjien (developers, dev) ja palvelinympäristöistä vastaavien järjestelmäylläpitäjien (operations, ops) välillä. On erittäin tavallista, että sovelluskehittäjät eivät pääse edes kirjautumaan tuotantopalvelimille ja sovellusten tuotantoon vieminen sekä esim. tuotantotietokantaan tehtävät skeeman päivitykset tapahtuvat ainoastaan ylläpitäjien toimesta.

Tälläisessä ympäristössä esim. continuous deploymentin harjoittaminen on lähes mahdotonta, tilanne ajautuukin helposti siihen, että tuotantopalvelimelle pystytään viemään uusia versioita vain harvoin, esimerkiksi ainoastaan 4 kertaa vuodessa.

Joustavammat toimintamallit uusien ominaisuuksien tuotantoon viemisessä vaativatkin täysin erilaista kulttuuria, sellaista, missä kehittäjät (dev) ja ylläpito (ops) työskentelevät tiiviissä yhteistyössä. Esim. sovelluskehittäjille tulee antaa tarvittava pääsy tuotantopalvelimelle tai Scrum-tiimiin tulee sijoittaa palvelinten ylläpidosta ja operoinnista huolehtivia ihmisiä. Toimintamallista missä kehittäjät ja ylläpitäjät eli _dev-_ ja _ops-ihmiset_ työskentelevät tiiviisti yhdessä käytetään nimitystä [DevOps](https://en.wikipedia.org/wiki/DevOps).

DevOps on termi, joka on nykyään monin paikoin esillä, esimerkiksi työpaikkailmoituksissa voidaan arvostaa DevOps-taitoja tai jopa etsiä ihmistä DevOps-tiimiin. On myös myynnissä mitä erilaisimpia DevOps-työkaluja. On kuitenkin jossain määrin epäselvää mitä kukin tarkoittaa termillä DevOps.

Suurin osa (järkevistä) määritelmistä tarkoittaa DevOpsilla nimenomaan kehittäjien ja järjestelmäylläpidon yhteistä työnteon ja kommunikaation tapaa, jonka pyrkimyksenä on tehdä sovelluskehityksen aikaansaannosten käyttöönotto mahdollisimman sujuvaksi. Tämän takia onkin hyvä puhua DevOps-kulttuurista.

On olemassa joukko käsitteellisiä ja teknisiä työkaluja, jotka usein liitetään DevOps-tyyliseen työskentelyyn, esim.

- automatisoitu testaus
- continuous deployment
- laskenta- ja tallennuskapasiteetin virtualisointi
- kontainerisointi (docker)
- infrastructure as code
- pilvipalveluna toimivat palvelimet ja sovellusympäristöt (PaaS, IaaS, SaaS)

Monet edellisistä ovat kehittyneet vasta viimeisen 5-10 vuoden aikana ja täten mahdollistaneet DevOps:in helpomman soveltamisen.

Eräs tärkeimmistä DevOps:ia mahdollistavista asioista on ollut siirtyminen yhä enenevissä määrin käyttämään fyysisten palvelinten sijaan virtuaalisia ja pilvessä toimivia palvelimia. Pikkuhiljaa myös "palvelinrautaa" on ruvettu määrittelemään koodin avulla käsiteltävien konfiguraatiotiedostojen avulla. Englanniksi tästä ilmiöstä käytetään nimitystä [infrastructure as code](https://en.wikipedia.org/wiki/Infrastructure_as_code).

Palvelinten, tallennuskapasiteetin ja verkon konfiguraatioiden automatisoitu ohjelmallisesti tapahtuva hallinnointi on siis yleistynyt koko ajan. Palvelinten konfiguraatioita voidaan tallettaa versionhallintaan ja jopa testata. Sovelluskehitys ja ylläpito ovat alkaneet muistuttaa enemmän toisiaan kuin vanhoina (huonoina) aikoina. Tämä suuntaus on johtanut siihen, että sovelluskehittäjiltä on ruvettu pikkuhiljaa vaatimaan sellaisia taitoja, jotka olivat aiemmin selkeästi järjestelmäylläpitäjien vastuulla.

Työkalujen käyttöönotto ei kuitenkaan riitä, DevOps:in "tekeminen" lähtee pohjimmiltaan kulttuurisista tekijöistä, tiimirakenteista, sekä asioiden sallimisesta.

Scrumin ja ketterien menetelmien eräs tärkeimmistä periaatteista on tehdä kehitystiimeistä _"cross functional"_, eli sellaisia, että ne sisältävät kaiken tietotaidon, joka tarvitaan saamaan user storyt valmiiksi definition of donen määrittelemällä laatutasolla. DevOps onkin eräs keino viedä ketteryyttä vielä askel pitemmälle, mahdollistaa se, että ketterät tiimit ovat todella cross functional ja että ne pystyvät viemään vaivattomasti toteuttamansa uudet toiminnallisuudet tuotantoympäristöön asti sekä jopa testaamaan ja operoimaan niitä tuotannossa.

Eräs parhaista DevOpsin määritelmistä on [Daniel Storin](http://turnoff.us/geek/devops-explained/) käsialaa:

![]({{ "/images/3-19.png" | absolute_url }}){:height="750px" }

## Yhteenveto - ketterän testauksen nelikenttä

Ketterän testauksen kenttää voidaan jäsentää alunperin Brian Maricin käsialaa olevan [Agile Testing Quadrants](http://lisacrispin.com/2011/11/08/using-the-agile-testing-quadrants/) -kaavion avulla.

![]({{ "/images/3-20.png" | absolute_url }}){:height="400px" }

Ketterän testauksen menetelmät voidaan siis jakaa neljään luokkaan (Q1...Q4) seuraavien dimensioiden suhteen:

- business facing vs. technology facing, kohdistuuko testaus käyttäjän kokemaan toiminnallisuuteen vai enemmän ohjelmiston sisäisen toiminnallisuuden yksityiskohtiin
- supporting team vs. critique to the product, onko testien rooli toimia sovelluskehittäjien tukena vai varmistaa sovelluksen ulkoinen laatu

Testit ovat suurelta osin automatisoitavissa, mutta esim. tutkiva testaaminen (exploratory testing) ja käyttäjän hyväksymistestaus (user acceptance testing) ovat luonteeltaan manuaalista työtä edellyttäviä.

Kaikilla "neljänneksillä" on oma roolinsa ja paikkansa ketterässä ohjelmistokehityksessä, ja on pitkälti kontekstisidonnaista missä suhteessa testaukseen ja laadunhallintaan käytettävissä olevat resurssit kannattaa kuhunkin neljännekseen kohdentaa.

Kaavio on jo hieman vanha, alunperin vuodelta 2003 joten se ei tunne vielä käsitettä tuotannossa testaaminen.

## Loppupäätelmiä testauksesta ja laadunhallinnasta

Tässä luvussa esitettävät asiat ovat osin omia, kokemuksen ja kirjallisuuden perusteella syntyneitä testaukseen liittyviä mielipiteitä.

Ketterissä menetelmissä kantavana teemana on arvon tuottaminen asiakkaalle ja tätä kannattaa käyttää ohjenuorana myös arvioitaessa mitä ja miten paljon projektissa tulisi testata. Testauksella ei ole itseisarvoista merkitystä, mutta testaamattomuus alkaa pian heikentää tuotteen laatua liikaa sekä hidastaa kehitysnopeutta radikaalilla tavalla. Joka tapauksessa testausta ja laadunhallintaa on tehtävä paljon ja toistuvasti, tämän takia testauksen automatisointi on yleensä pidemmällä tähtäimellä kannattavaa.

Testauksen automatisointi ei ole halpaa eikä helppoa. Väärin, väärään aikaan tai väärälle "tasolle" tehdyt automatisoidut testit voivat tuottaa enemmän harmia ja kustannuksia kuin hyötyä, erityisen suuri riski on käyttöliittymän kautta tehtävillä testeillä.

Jos ohjelmistossa on komponentteja, jotka tullaan ehkä poistamaan tai korvaamaan pian, on useimmiten järkevintä olla automatisoimatta niiden testejä. Esimerkiksi osassa 2 esitelty [MVP eli Minimal Viable Product](/osa2#vaatimusm%C3%A4%C3%A4rittely-2010-luvulla) on karsittu toteutus, jonka avulla halutaan nopeasti selvittää, onko jokin ominaisuus ylipäätään käyttäjien kannalta arvokas. Jos MVP:n toteuttama ominaisuus osoittautuu tarpeettomaksi, se poistetaan järjestelmästä. MVP-periaattella tehty ominaisuus on siis useimmiten viisasta tehdä ilman testien automatisointia.

Ongelmallista kuitenkin usein on, että kertakäyttöiseksi tarkoitettu komponentti voi jäädä järjestelmään pitkäksikin aikaa, joskus jopa pysyvästi koska sitä "ei ole aikaa" toteuttaa kunnolla.

Kokonaan uutta ohjelmistoa tai komponenttia tehtäessä on yleensä järkevää antaa ohjelman rakenteen ensin stabiloitua ja tehdä kattavammat testit vasta myöhemmin. Komponenttien testattavuus kannattaa kuitenkin pitää koko ajan mielessä vaikka niille ei heti testejä tehtäisikään.

Oppikirjamääritelmän mukaista TDD:tä sovelletaan melko harvoin. Välillä kuitenkin TDD on hyödyllinen väline, esim. kehitettäessä rajapintoja, joita käyttäviä komponentteja ei ole vielä olemassa. Testit tekee samalla vaivalla kuin koodia käyttävän "pääohjelman".

Kattavia yksikkötestejä ei kannata tehdä ohjelman kaikille luokille, usein vaihtoehto on tehdä integraatiotason testejä ohjelman isompien komponenttien rajapintoja vasten. Tällaiset testit pysyvät todennäköisemmin valideina komponenttien sisäisen rakenteen muuttuessa. Yksikkötestaus on hyödyllisimmillään kompleksia logiikkaa sisältävien luokkien testauksessa.

Vaikka käyttöliittymän läpi tehtävät järjestelmätason testit ovatkin riskialttiita käyttöliittymän mahdollisten muutosten takia, ovat ne usein hyödyllisin testien muoto, sillä toisin kuin esim. yksikkötestit, ne testaavat sovellusta kokonaisuudessaan (eli end to end).

Automaattisia testejä kannattaa kirjoittaa mahdollisimman paljon etenkin niiden järjestelmän komponenttien rajapintoihin, joita muokataan usein. Liian aikaisessa vaiheessa projektia tehtävät käyttöliittymän läpi suoritettavat testit saattavat aiheuttaa kohtuuttoman paljon ylläpitovaivaa, sillä testit hajoavat helposti pienistäkin käyttöliittymään tehtävistä muutoksista. Eli on syytä olla tarkkana sen suhteen missä vaiheessa käyttöliittymän läpi tapahtuva automatisoitu testaaminen kannattaa aloittaa.

Testitapausten kannattaa olla mahdollisimman paljon testattavan komponentin oikeiden käyttöskenaarioiden kaltaisia. Pelkkiä testauskattavuutta kasvattavia testejä on turha tehdä.

Testitapauksissa kannattaa käyttää mahdollisimman oikean kaltaista dataa, erityisesti järjestelmätason testeissä. Koodissa nimittäin lähes aina hajoaa jokin kun käytetään oikeaa dataa riippumatta siitä, miten hyvin testaus on suoritettu. Parasta onkin jos staging-ympäristössä on käytössä sama data kuin tuotantoympäristössä.

Oma näkemykseni testaukseen on hieman poikkeava ja jopa jossain määrin vastakkainen kuin niin sanottu [testauspyramidi](https://martinfowler.com/articles/practical-test-pyramid.html#TheTestPyramid), eli Mike Cohenin ajatus, siitä että pääosan testeistä tulisi olla yksikkötestejä, sillä niitä on helppo tehdä, ja ne ovat nopeita suorittaa. Järjestelmää kokonaisuudessan testaavat end to end -testit taas ovat hitaita, niitä on hankala tehdä ja ne ovat alttiita hajoamaan pienistä muutoksista, joten niiden määrän tulisi olla mahdollisimman vähäinen:

![]({{ "/images/3-23.png" | absolute_url }}){:height="300px" }

Cohenin pyramidi-idea on jo aika vanha, ja läheskään kaikki eivät ole siitä samaa mieltä. Mielipiteitä löytyy [laidasta laitaan](https://laredoute.io/blog/the-traditional-test-pyramid-pitfalls-and-anti-patterns/) ja varmasti onkin niin, että yhtä totuutta asiasta ei ole. Kuten jo aiemminkin totesin, väärälle "tasolle" väärään aikaan tehdyt automatisoidut testit ovat suuri riski, ja koska järjestelmätason testien tekeminen on todella työlästä, piilee niissä aina hukkainvestoinnin vaara.

Ehdottomasti kaikkein tärkein asia sovelluksen laadunhallinnan kannalta on mahdollisimman usein tapahtuva tuotantoonvienti. Se taas edellyttää hyvin rakennettua deployment pipelineä, riittävän kattavaa testauksen automatisointia ja helpottuu oleellisesti jos feature branchien sijaan käytetään trunk based development -periaatetta. Suosittelen lämpimästi että tuotantoonvienti tapahtuu niin usein kuin mahdollista, jopa useita kertoja päivässä. Tämä takaa yleensä sen, että pahoja integrointiongelmia ei synny, ja sovellukseen syntyvät regressiot havaitaan ja pystytään korjaamaan mahdollisimman nopeasti.

## Tieteellinen evidenssi

Edellä esitellyistä jatkuvan julkaisun ja laadunhallinnan käytenteiden toimivuudesta on runsaasti anekdotaalista evidenssiä ja monista osa-aluiesta on tehny myös akateemista tutkimusta. Myös se, että erinomaisesti menestyneet organisaatiot kuten Google, Netflix, Amazon ja Facebook luottavat näihin käytänteisiin, ja ovat jopa paikoin kehittäneet ne, puhuu niiden puolesta.

Toistaiseksi vakuuttavimman ja tieteellisesti vakaimmalla pohjalla olevan näkemyksen tarjoaa vuonna 2018 julkaistussa kirjassa
[Accelerate: The Science of Lean Software and DevOps: Building and Scaling High Performing Technology Organizations](https://www.amazon.com/Accelerate-Software-Performing-Technology-Organizations/dp/1942788339) raportoitu vuosina 2013-2017 tehty laaja, yli 20000 vastaukseen perustuva kyselytutkimus.

Tutkimustulokset on myös julkaistu korkeatasoisilla vertaisarvioiduilla foorumeilla. Tämän osan kannalta oleellisia tuloksia käsittelee esimerkiksi [Forsgren, Humble: The Role of Continuous Delivery in IT and Organizational Performance](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2681909).

Tutkimuksen tuloksia summaa seuraava kaavio:

![]({{ "/images/3-24.png" | absolute_url }}){:height="400px" }

Tutkimuksen ytimessä on selvittää mitkä tekijät vaikuttavat edesauttavasti yrityksen tehokkaaseen toimintaan, kuvassa _organizational performance_. Kyselytutkimuksessa yrityksen tehokkuutta on mitattu seuraavilla kysymyksillä:

_Select the number that best indicates degree of conformance to your organization's goals over the past year. (1=Performed well below, 7 = Performed well above)_

- Overall organizational performance
- Overall organizational profitability
- Relative market share for primary products
- Overall productivity of the delivery system Increased number of customers
- Time to market
- Quality and performance of applications

Kuvan vasemmassa reunassa taas on yrityksien harjoittamia käytänteitä: versionhallinta, testiautomaatio, jatkuva integraatio ja tuotantoonviennin automatisointi, siis "DevOps"-käytänteet, jotka muodostavat jatkuvan tuotantoonviennin (continuous delivery) ytimen. Myös näiden käyttöä vastaajaorganisaatioissa on mitattu kyselytutkimuksessa skaalalla 1-7.

Tutkimus löysi merkittävän yhteyden DevOps-käytänteiden käytön ja yrityksen tehokkaan toiminnan välillä. Mielenkiintoisena "sivutuotteena" käytänteiden intensiiviselle harjoittamiselle on myös korkeampi työtyytyväisyys ja vähäisempi määrä loppuunpalaneita työntekijöitä.

Ylläoleva kuva on vuonna 2016 ilmestyneestä artikkelista. Tässä vaiheessa Forsgrenin ja kumppaneiden tutkimus keskittyi siihen, miten tekniset DevOps-käytänteet vaikuttavat yrityksen tehokkuuteen.

Sittemmin tutkimuksen fokus on laajennettu myös firman johtamiskäytänteisiin, useimmat näistä liittyvät Lean-filosofiaan, joka on aiheenamme [osassa 5](/osa5/).

On myös identifioitu lisää organisaatioiden tehokkuuteen liittyviä käytänteitä, mm. trunk based development ja tuotannossa olevan sovelluksen monitorointi.

Seuraavassa Accelerate-kirjasta lainattu kuva, joka visualisoi miten eri käytänteet edesauttavat yrityksen tehokkuutta:

![]({{ "/images/3-26.png" | absolute_url }}){:height="500px" }
