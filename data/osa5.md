---
layout: page
title: Osa 5
title_long: 'Lean, ketterän ohjelmistokehityksen skaalaaminen ja ketterä ohjelmistokehitys tutkimuksen valossa'
inheader: yes
permalink: /osa5/
---

<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/3.0/">
  <img alt="Creative Commons -lisenssi" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-sa/3.0/88x31.png"
  />
</a>

Kurssin viidennellä viikolla käsitellään kolmea aihetta, viime vuosina ketterään ohjelmistokehitykseen paljon vaikutteita antanutta Lean-filosofiaa, ketterien menetelmien skaalaamista suurempiin projekteihin sekä erilaisia tilasto- ja tutkimustietoa ketterien menetelmien käytöstä ja hyödyistä.

## Typoja materiaalissa

{% include typo_instructions.md path="/osa5.md" %}

{% include norppa.md %}

## Lean

Kurssin aikana on jo muutamaan kertaan sivuttu käsitettä _Lean_, katsotaan nyt hieman tarkemmin mistä on kysymys.

### Taustaa

Lean on kotoisin Toyotan tuotannon ja tuotekehityksen menetelmistä, ja sen synty on jäljitettävissä 1900-luvun alkupuoliskolle.

Toisen maailmansodan jälkeen Japanissa oli suuri jälleenrakennuksen buumi, mutta pääomaa ja raaka-aineita oli saatavissa niukalti. Havaittiin, että laadun parantaminen nostaa tuottavuutta: mitä vähemmän tuotteissa ja tuotantoprosesseissa on virheitä ja ongelmia, sitä enemmän tuottavuus kasvaa, ja se taas johtaa markkinaosuuden kasvuun ja sitä kautta uusiin työmahdollisuuksiin. Japanilaisiin yrityksiin muodostui vahva laatua korostava kulttuuri.

Resurssien niukkuus johti siihen, että Toyota kehitti ns. _Just In Time (JIT)_ -tuotantomallin, missä ideaalina on aloittaa tuotteen valmistaminen vasta kun ostaja on jo tilannut tuotteen. Vastakohtana tälle on perinteinen massatuotanto, missä tuotteita valmistetaan etukäteen suuret määrät varastoon. Pyrkimys oli saada tuote tilauksen jälkeen mahdollisimman nopeasti kuluttajalle, eli haluttiin mahdollisimman lyhyt _läpimenoaika_ (engl. lead time) tilauksesta toimitukseen.

JIT-tuotantomallista oli monia hyötyjä. Asiakkaiden muuttuviin tarpeisiin oli helppo valmistautua toisin kuin massatuotannossa, missä varastoon tehdyt tuotteet oli saatava myydyksi vaikka ne eivät olisi enää asiakkaan mieleen. Koska tuotteen läpimenoaika tilauksesta asiakkaalle oli lyhyt, laatuongelmat paljastuivat nopeasti,
toisin kuin mahdollisesti kuukausia varastossa olevilla tuotteilla.

Massatuotanto pyrki optimoimaan yksittäisten työntekijöiden ja koneiden työpanosta, ideaalina että koneiden käyttöaste on koko ajan 100%. Toyotan JIT-tuotantomallissa optimoinnin kohteeksi taas tuli tuotteen läpimenoaika. Pyrkimyksenä oli eliminoida kaikki mahdollinen _hukka_ (engl. waste), joka ei edesauttanut työn, eli tuotannon alla olevan tuotteen, nopeaa _virtaamista_ (engl. flow) tilauksesta asiakkaalle. Virtausta haittaaviin tekijöihin, esim. laatuongelmiin tai epäoptimaalisiin työtapoihin puututtiin heti.

Perinteisestä massatuotannosta poiketen Toyota myös omaksui työntekijöitä kunnioittavan, kuuntelevan ja _vastuuttavan_ (engl. empowering) tuotannon optimoimisen kulttuurin. Tärkeäksi periaatteeksi tuli koko henkilöstön tasolla tapahtuva toiminta- ja työskentelytapojen jatkuva parantaminen. Käytännössä jokainen työntekijä oli oikeutettu ja jopa velvollinen vaikka pysäyttämään koko tuotantolinjan heti havaitessaan ongelmia.

#### Toyota production system, TPS

Vuodesta 1965 alkaen Toyota alkoi kutsua toimintatapaansa [Toyota Production Systemiksi](https://global.toyota/en/company/vision-and-philosophy/production-system/) (TPS). Ensimmäiset englanninkieliset julkaisut aiheesta ovat vuodelta 1977. Toyotan menestys herätti kiinnostusta länsimaissa ja MIT:in tutkijat alkoivat 1980-luvun lopussa kartoittamaan ja dokumentoimaan tarkemmin Toyotan tuotantojärjestelmää. Tutkijat lanseeraavat nimikkeen _lean_- eli virtaviivainen tuotanto kuvaamaan TPS:n taustafilosofiaa.

Vuonna 1990 ilmestyi kirja [The Machine That Changed the World](<https://en.wikipedia.org/wiki/The_Machine_That_Changed_the_World_(book)>), joka toi leanin laajempaan länsimaalaiseen tietoisuuteen. Toyota alkoi 2000-luvulla käyttämään tuotantojärjestelmästään myös sisäisesti nimitystä lean.

Viimeisen 30 vuoden aikana on ilmestynyt suuri määrä kirjoja, jotka kuvaavat Toyotan tuotantojärjestelmää, eräs kuuluisimmista ja vaikutusvaltaisimmista näistä on [Jeffrey Likerin The Toyota Way](https://www.amazon.com/Toyota-Way-Management-Principles-Manufacturer/dp/0071392319) (2001).

Alun perin lean oli Toyotalla autojen _tuotantoa_ (engl. production) optimoiva toimintatapa, sittemmin leania on ruvettu hyödyntämään myös _tuotekehityksessä_ (engl. development). Tuotanto ja tuotekehitys ovat luonteeltaan hyvin erilaisia ja niihin sovellettavat lean-käytänteet eroavat monin paikoin.

Leania on sovellettu lukuisille eri aloille, ohjelmistotuotantoon sen lanseerasi 2003 ilmestynyt Mary ja Tom Poppendieckin kirja [Lean software development, an agile toolkit](https://www.amazon.com/Lean-Software-Development-Agile-Toolkit/dp/0321150783). Klassikon asemastaan huolimatta kirja on paikoin vanhentunut ja tulkitsee leania osin melko suppeasti. Myös Scrumin kehittäjät Ken Schwaber ja Jeff Sutherland tunsivat hyvin lean-ajattelun, ja monet Scrumin piirteet ovat saaneet vaikutteita leanista.

Leania on ruvettu soveltamaan yhä suurempaan määrään asioita, aina terveydenhoidosta, leipomoihin ja pankkitoimintaan. Myös Helsingin yliopiston hallinto on alkanut puhumaan yhä enenevissä määrin leanista ja parin vuoden ajan aiheesta on järjestetty yliopiston sisällä useita tilaisuuksia. Lean tai mitä erilaisimmat lean-nimikkeen alla olevat ja myytävät asiat ovatkin alkaneet elämään omaa, Toyota production systemistä erillistä elämäänsä ja nykyään on välillä vaikea sanoa tarkemmin mistä on kyse kun joku puhuu leanista.

Käsittelemme seuraavassa leania tarkemmin Craig Larmanin ja Bas Vodden mainioon kirjaan Scaling Lean and Agile Development perustuen. Kirjan leania esittelevä luku on kaikkien luettavissa [täällä](http://www.leanprimer.com/downloads/lean_primer.pdf). Luku esittelee nimenomaan Toyota production systemin modernia muotoa.

### Leanin tavoitteet, perusta ja peruspilarit

Leania havainnollistetaan useissa lähteissä _lean thinking houseksi_ nimitettävänä kaaviona:

![]({{ "/images/5-1.png" | absolute_url }}){:height="550px" }

Leanilla on "talon ylimpänä kerroksena" sijaitseva _tavoite_ (engl. goal), _perusta_ (engl. foundation), kaksi _peruspilaria_ ja joukko näitä tukevia _periaatteita_ (14 principles ja product development -periaatteet). Näiden lisäksi on olemassa joukko leania tukevia työkaluja, joista kuuluisin lienee kurssinkin aikana mainittu Kanban.

Leanin tavoitteena on _saada aikaan pysyvä nopea tapa edetä "ideasta asiakkaalle myytyyn tuotteeseen" siten, että tämä tapahtuu työntekijöitä ja yhteistyökumppaneita riistämättä, ylläpitäen korkea laatutaso ja asiakastyytyväisyys._

Jotta tavoite olisi mahdollinen, tulee taustalla olla syvälle yrityksen kaikille tasoille juurtunut pitkän tähtäimen hyötyihin tähtäävä lean-toimintatapa, mitä johtajat soveltavat ja opettavat alaisille. Tätä nimitetään _leanin perustaksi_.

Leanin kaksi peruspilaria ovat _jatkuva parantaminen_ (engl. continuous improvement) ja _ihmisten kunnioittaminen_ (engl. respect for people).

_Jatkuva parantaminen_ määrittelee pohjimmiltaan koko Toyotan toimintakulttuurin, jonka ytimessä on halukkuus oppia ja kannustava ilmapiiri muutosten tekemiselle:

_The root of the Toyota Way is to be dissatisfied with the status quo; you have to ask constantly, "Why are we doing this?"._

Jatkuvaan oppimiseen ja toiminnan parantamiseen kannustava ilmapiiri taas on mahdollista ainoastaan, jos kaikki toiminta perustuu _ihmisten kunnioittamiseen_. Joka taas tarkoittaa monia konkreettisia asioita, esim. työntekijöiden kuuntelemista, vastuuttamista ja mentorointia, työympäristön mielekkyyttä ja turvallisuutta. Toyota laajentaa periaatteen kattamaan myös alihankkijat ja loppuasiakkaat, esimerkiksi alihankkijoiden kanssa Toyota rakentaa aitoja partneriuksia, joista molemmat hyötyvät sekä opettaa alihankkijoille lean-ajattelua.

Kaikki tämä kuulostaa abstraktilta, ja asia toivon mukaan konkretisoituu hieman kun käsittelemme hetken päästä leanin tavoitteeseen ja peruspilareihin nojaavia _lean-periaatteita_ (engl. lean principles), jotka ohjaavat konkreettisemmin leania toimintaa.

### Jatkuva parantaminen – arvo ja hukka

Toyota production systemin kehittäjä [Taiichi Ohno](https://en.wikipedia.org/wiki/Taiichi_Ohno) kuvaa jatkuvan parantamisen periaatetta seuraavasti:

> All we are doing is looking at the time line, from the moment the customer gives us an order to the point where we collect the cash. And we are reducing the time line by reducing the non-value-adding wastes.

Ohnon mukaan keino päästä nopeampaan tuotantosykliin on siis eliminoida _arvoa_ (engl. value) tuottamattomia asioita eli _hukkaa_ (engl. waste).

Mitä lean tarkalleen ottaen tarkoittaa arvolla ja hukalla? Arvolla tarkoitetaan niitä asioita ja työnteon vaiheita, mistä asiakas on valmis maksamaan, eli mitkä tuottavat asiakkaalle hyötyä. Hukalla taas tarkoitetaan kaikkea tuotantoon liittyvää, mikä ei tuota asiakkaalle arvoa.

Leanin mukaan on olemassa kolmen eri tyypin hukkaa: muri, mura ja muda.

Käsitellään ensin näistä selkeintä eli _muda_-tyyppistä hukkaa. Lean tunnistaa alunperin 7 lähdettä muda-hukalle:

- ylituotanto (engl. over production)
- välivarastointi (engl. in-process inventory)
- liikatyö (engl. over/extra processing)
- tarpeeton siirtely (engl. transportation)
- tarpeeton liikkuminen (engl. motion)
- odotus (engl. waiting)
- viat (engl. defects)

Alunperin nämä ovat olleet autojen valmistuksen tuotantolinjaan liittyvää hukkaa, avataan nyt käsitteitä tulkitsemalla ne samalla ohjelmistokehityksen kontekstiin.

#### Ylituotanto (engl. over production)

Tuotteita tulee valmistaa ainoastaan siinä määrin, mitä asiakas on niitä tilannut, eli ei kannata tehdä varastoon. Varastoon tehdyt tuotteet ovat monella tapaa ongelmallisia. Ne syövät pääomaa ja saattavat myös sisältää systemaattisia vikoja, jotka huomataan vasta kun tuotteet otetaan käyttöön.

Ohjelmistojen ylimääräisten toiminnallisuuksien voidaan ajatella olevan ylituotantoa. Joidenkin tutkimuksien mukaan jopa [64% ohjelmistojen toiminnallisuuksista](https://www.mountaingoatsoftware.com/blog/are-64-of-features-really-rarely-or-never-used) on joko ei ollenkaan tai ainoastaan erittäin harvoin käytettyjä. Ylimääräisten toiminnallisuuksien toteuttaminen maksaa sekä kasvattaa koodin määrää, ja tämä taas tekee jatkokehityksen riskialttiimmaksi.

#### Välivarastointi (engl. in-process inventory)

Tähän kategoriaan kuuluu osittain tehty työ ja sen säilöminen, eli esim. komponentit joille ei vielä ole käyttöä. Ongelmat ovat samat kuin ylituotannossa.

Ohjelmistokehityksessä välivarastointia ovat esim. liian tarkkaan tehty vaatimusmäärittely sellaisille ominaisuuksille, joita ei vielä hetkeen toteuteta, valmis koodi jota ei ole vielä testattu tai otettu käyttöön tai koodi, joka toteuttaa asiakkaan ehkä tulevaisuudessa haluamia toiminnallisuuksia.

#### Liikatyö (engl. over/extra processing)

Kaikki ylimääräiset työvaiheet, mitkä eivät ole välttämättömiä riittävän laadukkaaseen lopputulokseen ovat myös hukkaa.

Tällaisia ovat esimerkiksi prosessin pakottamat työvaiheet, joilla ei kuitenkaan ole lopputuloksen kanssa merkitystä, esim. pakolliseksi määritelty suunnitteludokumentti, jota kukaan ei lopulta tarvitse. Vastaavanlainen haitallinen asia voi olla vaatimus siitä että testien rivikattavuuden kattavuuden on pakko olla 100%, sillä tämä voi johtaa lähes hyödyttömien, pelkästään kattavuutta lisäävien testien tekemiseen.

Liian hyvällä laadulla tehty koodi voidaan myös tulkita joissain tapauksissa liikatyöksi. Jos esim, ollaan tekemässä jonkin ominaisuuden hyödyllistä validoivaa MVP:tä ([ks. osa 2](/osa2/#vaatimusmäärittely-2010-luvulla)), kannattaa toteutus tehdä normaalia tuotantokoodia heikommalla laadulla, ja esim. automatisoitu testaus voidaan jättää tekemättä. MVP:tä toteutettaessa kannattaa siis useimmiten ottaa [teknistä velkaa](/osa4/#tekninen-velka), joka sitten saatetaan joutua maksamaan takaisin jos MVP:n toteuttama ominaisuus päätetään jättää järjestelmään.

#### Tarpeeton materiaalin siirtely (engl. transportation)

Tuotteen tekemiseen tarvittavia raaka-aineita tai osittain valmista tuotetta ei tulisi joutua siirtelemään tarpeettomasti paikasta toiseen.

Ohjelmistokehityksen kontekstissa tämä tarkoittaa että kehitettävä ohjelmisto tulisi määritellä, suunnitella, toteuttaa, testata ja viedä tuotantoon yhden tiimin toimesta. Eli ns. "handoff", missä esimerkiksi toteutettu ohjelmisto annetaan kehittäjätiimistä erillisen tiimin (esim. QA-tiimi) testattavaksi ajatellaan hukkana.

#### Työntekijöiden tarpeeton liikkuminen (engl. motion)

Tuotantovälineet ja materiaalit tulisi sijoittaa siten, että työntekijöiden ei tarvitse tarpeettomasti siirtyä paikasta toiseen tuotetta valmistaessaan.

Ohjelmistokehityksessä tarpeettomaksi liikkumiseksi on ajateltu _task switching_ eli liian nopea vaihtelu eri työtehtävien välillä, esim. työskentely yhtä aikaa monessa projektissa.

#### Turha odotus (engl. waiting)

Turhaa odotusta on esimerkiksi aika, joka joudutaan odottamaan, että tarpeelliset raaka-aineet saapuvat, tai että jokin tuotantoväline vapautuu muusta käytöstä.

Ohjelmistokehityksen kontekstissa turhaa odotusta on, kun joudutaan odottamaan että yrityksen johto hyväksyy vaatimusmäärittelyn, testaajat ehtivät testaamaan ohjelman uuden version, ylläpito vie sovelluksen uuden version tuotantoon, joku mergeää pull requestin...

#### Viat (engl. defects)

Jos tuotantolinjan aiheuttamaa systemaattista vikaa ei huomata ajoissa, ehditään viallisia tuotteita/komponentteja ehkä valmistamaan suuret määrät. Vielä pahempaa on, jos viallisia tuotteita pääsee kuluttajille asti. Niiden korvaaminen tai korjaaminen on kallista, ja imagolle aiheutunut haitta potentiaalisesti suuri. Jos vikoja tulee, onkin oleellista havaita ja korjata ne mahdollisimman nopeasti.

Ohjelmistokehityksessä tuotteeseen tulee lähes väistämättä vikoja, ja on kustannustehokasta suorittaa laadunhallinta niin aikaisessa vaiheessa kuin mahdollista.

Nämä alkuperäiset vuosikymmeniä sitten autonvalmistuksen kontekstiin sovitetut 7 muda-hukkaa on tulkittu uudelleen yhä uusiin konteksteihin, kuten ohjelmistokehitykseen.

Vuosien varrella on ehdotettu myös uusia hukan muotoja, näistä eräs _ihmisten potentiaalin alihyödyntäminen_ on jossain määrin jo vakiintunut. Englanniksi tätä hukan muotoa kuvaillaan seuraavasti _Under-realizing people’s potential and varied skill, insight, ideas, suggestion._

#### Muri- ja mura-tyyppinen hukka

Äsken käsitelty _muda_-tyyppinen hukka eri muodoissaan on eniten esillä oleva leanin hukan muodoista, ja joissain lähteissä ei muita kahta hukkatyyppiä eli _muraa_ ja _muria_ välttämättä edes mainita.

_Mura_-tyyppinen hukka on epäsäännöllisyyttä tai epäyhdenmukaisuutta (engl. unevenness, non-uniformity, irregularity), työtavoissa tai työstettävässä tuotteessa.

Ohjelmistokehityksessä esim. toteutettavien user storyjen suuresti vaihteleva koko on mura-tyyppistä hukkaa, jonka seurauksena saattaa olla _muda_-tyyppinen hukka, eli esimerkiksi välivarastoinnin tarve. Tämä taas heikentää arvon läpivirtausta, eli aikaa, miten kauan user storyltä kestää backlogille asettamisesta valmiiksi tuotteen osaksi.

Kolmas hukan tyyppi _muri_ tarkoittaa ylikuormitusta tai mahdottomia vaatimuksia (engl. unreasonableness, impossible, too difficult). Autojen tuotantolinjaa ajatellessa, esim. koneiden käyttäminen 100% kapasiteetilla ilman säännöllistä huoltoa on luokiteltavissa muriksi. Ohjelmistokehitykseen tulkittuna muria voisivat olla esim. henkilöstön ylityöllistäminen. Muri-tyyppisen hukan, esim. henkilöstön ylikuormituksen seurauksena on todennäköisesti mudaa, eli tuotteeseen saattaa esimerkiksi syntyä vikoja.

### Kaizen

Jatkuvassa parantamisessa on siis tarkoitus optimoida toimintaa eliminoimalla asiakkaalle arvoa tuottamatonta hukkaa. Jatkuvasta parantamisesta käytetään usein sen japaninkielistä nimitystä _kaizen_, joka on kaikkia työntekijöitä koskeva kattava toimintafilosofia:

> As a mindset, it suggests "My work is to do my work and to improve my work" and "continuously improve for its own sake."

Kaizen on myös konkreettinen tapa toimia:

- valitaan jokin tekniikka/työskentelytapa ja sitoudutaan sen suorittamiseen joksikin aikaa
- kun toiminta on stabiloitunut, tarkastellaan valitun työskentelytavan toimivuutta ja optimoidaan sitä havaittujen epäkohtien suhteen ja luodaan näin uusi työnteon standarditapa
- toistetaan tätä sykliä ikuisesti...

Kaizeniin liittyvä syklinen parannusprosessiin liittyy usein tasaisin väliajoin pidettävät tilaisuudet, eli "kaizen eventit". Scrumin retrospektiivit ovat klassinen esimerkki kaizen eventeistä.

#### Lean työkalu: value stream mapping

Hukan etsimiseen ja kartoittamiseen käytetään usein nimellä [value stream mapping](https://en.wikipedia.org/wiki/Value-stream_mapping) kulkevaa tekniikkaa. Ideana on kuvata tuotteen kulku käytetyn prosessin työvaiheiden läpi ja visualisoida tuotteelle arvoa tuottavat työvaiheet suhteessa tuotteen koko valmistuksen elinkaareen.

![]({{ "/images/5-2.png" | absolute_url }}){:height="400px" }

Kuvassa on kuusi työvaihetta, joiden läpi tuote, esim. user story kulkee. Kussakin työvaiheessa kuluvan ajan voidaan ajatella kasvattavan työn arvoa, esim. vaihe _code and test_, vie 2 tuntia, mikä on välttämätöntä sen kannalta, että story ylipäätään saataisiin julkaistua. Kunkin työvaiheen välillä story on _välivarastossa_, odottamassa seuraavaa työvaihetta, ja välivarastointi taas on eräs hukan muoto. Value stream mappingin avulla onkin tarkoitus tuoda esille kaikki "välivarastot", turhat odotukset ja tarpeettomat työvaiheet, jotta olisi mahdollista miettiä miten niitä saataisiin minimoitua.

#### Lean työkalu: perimmäisen syyn analyysi - five whys

Jos value stream mapping tai jokin muu menetelmä paljastaa tuotantoprosessista hukkaa, eli arvoa tuottamattomia asioita, pyritään niistä hankkiutumaan eroon. Jatkuvan parantamisen eli kaizenin ei kuitenkaan ole tarkoitus lääkitä pelkkää oiretta, vaan tehdä havaitulle hukalle _perimmäisen syyn analyysi_ (engl. root cause analysis) ja pyrkiä näin pysyvämpiin ja vaikuttavampiin parannuksiin.

Eräs root cause analysis -tekniikka on [five whys](https://en.wikipedia.org/wiki/Five_whys), minkä toimintaa on helpointa havainnollistaa esimerkillä.

Edellisestä kuvassa olevasta _value stream mapista_ havaitaan, että koodin valmistumisesta menee 1.5 viikkoa sen tuotantoon saamiseen.

- **Miksi?** QA-osaston on vielä varmistettava, että koodi toimii staging-ympäristössä.
- **Miksi?** Ohjelmoijilla ei ole aikaa testata koodia itse staging-ympäristössä.
- **Miksi?** Ohjelmoijilla on kiire sprintin tavoitteena olevien user storyjen tekemisessä.
- **Miksi?** Edellisten sprinttien aikana tehtyjen storyjen bugikorjaukset vievät yllättävän paljon aikaa.
- **Miksi?** Laadunhallintaa ei ehditä koskaan tekemään kunnolla siinä sprintissä missä storyt toteutetaan.
- **Miksi?** Sprintteihin otetaan aina liian monta user storya.

Näin kysymällä toistuvasti (noin viisi kertaa) _miksi_ on mahdollista päästä ongelman perimmäisen syyn lähteille, eli sinne, mitä korjaamalla hukka saadaan toivon mukaan eliminoitua. Esimerkin kuusi miksi-kysymystä siis paljastaa ongelman perimmäiseksi syyksi sen, että _sprintteihin otetaan aina liian monta user storya_, eli hukan eliminoimiseksi on todennäköisesti parasta lähteä liikkeelle sprinttien työmäärän vähentämisellä.

Itseasiassa olisi ollut hyvä kysyä ainakin yksi _miksi_ lisää. Perimmäisen syyn kannalta oleellista on se, että minkä takia sprintteihin otetaan liikaa storyja. Johtuuko se kehitystiimistä itsestään vai tiimin ulkopuolisista voimista?

### Leanin periaatteita: pull-systeemi

Leanissa on siis tarkoituksena optimoida aikaa, joka kuluu tuotteen tilaamisesta sen asiakkaalle toimittamiseen. Arvo pyritään saamaan _virtaamaan_ (engl. flow) asiakkaalle ilman turhia viiveitä ja työvaiheita. Äsken esitelty value stream map siis visualisoi nimenomaan arvon virtausta.

Leanin mekanismi virtauksen optimointiin on _pull-systeemien_ käyttö. Pull-systeemillä tarkoitetaan tuotannonohjaustapaa, missä tuotteita, tai tuotteiden tarvitsemia komponentteja tehdään ainoastaan asiakkaan tilauksen niitä edellyttäessä. Tämän vastakohta on _push-systeemi_, missä tuotteita ja komponentteja tehdään etukäteen varastoon ja toivotaan sitten että tuotteet ja komponentit menevät kaupaksi.

Esimerkiksi pizzeriat toimivat pull-periaatteen mukaan, pizza valmistetaan vasta kun asiakas tilaa sen. Unicafe taas on push-systeemi, lounaita tehdään varastoon ja toivotaan että ne menevät kaupaksi asiakkaille.

Leanin taustaa käsitelleessä [luvussa](/osa5#taustaa) puhuttiin Just in time (JIT) -tuotantomallista. Käytännössä pull-systeemi on mekanismi JIT-tuotantomallin toteuttamiseen.

#### Kanban

Pull-systeemi toteutetaan usein _kanbanin_ avulla. Japaninkielinen sana kanban tarkoittaa signaalikorttia, englanniksi "card you can see". Kanban toteuttaa _visuaalisen ohjauksen_, jonka avulla työntekijöiden on helppo tietää miten seuraavaksi tulee toimia.

Kun asiakas tilaa tuotteen, viedään tilausta vastaava kanban-kortti tehtaalle.
Jos tuotteen valmistaminen edellyttää esim. viittä eri komponenttia, "tilataan" komponentit niitä valmistavilta työpisteiltä viemällä niihin kunkin komponentin tilausta vastaava kanban-kortti. Jos komponenttien valmistus edellyttää jotain muita komponentteja, tilataan nekin samalla periaatteella. Kun komponentti on valmis, viedään se tilaajalle. Samalla kanban-kortti palautetaan tulevien tilauksien tekemistä varten.

Kanban-kortteja on käytössä vain rajallinen määrä. Tällä kontrolloidaan sitä, että liikaa työtä ei pääse kasautumaan mihinkään tuotannon vaiheeseen. Näin kanbanin avulla "vedetään" (pull) tarvittavat komponentit, sen sijaan että komponentteja olisi etukäteen valmistettu varalta suuret määrät varastoon.

Kuten on jo mainittu välivarastoon tehdyt komponentit on eräs leanin hukan muoto. Varastoidut komponentit sitovat pääomaa, ja jos tilauksia ei tulisi tarpeeksi, niitä ei välttämättä tarvita koskaan. Välivarastointi saattaa myös viivästyttää vikojen ilmituloa: jos komponenteissa olisi valmistusvika, saattaisi kestää kauan kunnes vika paljastuisi ja viallisia komponentteja olisi ehkä ehditty valmistamaan varastoon suuret määrät.

Käytännössä pull-periaatteella toimiva tuotanto saattaa ylläpitää pieniä välivarastoja saadakseen tuotteen valmistamiseen kuluvan läpimenoaikaa optimoitua.

#### Kanban ohjelmistotuotannossa

Kanban on otettu laajalti käyttöön myös ketterässä ohjelmistokehityksessä, [osassa 2](/osa2#yht%C3%A4aikaa-teht%C3%A4v%C3%A4n-ty%C3%B6n-rajoittaminen) sivuttiin jo asiaa. Ohjelmistotuotannon kanban on periaatteiltaan hieman erilainen kuin perinteisessä tuotannossa käytetty kanban.

Toteutettavaa toiminnallisuutta, esim. user storyä tai jotain sen teknistä taskia vastaa kanban-kortti, joka kulkee eri työvaiheiden kautta.

Virtaus, eli yksittäisen storyn nopea valmistuminen saadaan aikaan rajoittamalla tietyissä työvaiheissa kesken olevan työn määrää asettamalla _work in progress_ (WIP) -rajoitteita.

Allaolevassa kuvassa oleva kanban-taulu on jaettu kolmeen työvaiheeseen _analysis, develop, test_, joille kullekin on asetettu WIP-rajoite. Työvaiheiden väliin on myös sijoitettu välivarastoja, _dev ready_ ja _build ready_, joilla myös on WIP-rajoitteet.

![]({{ "/images/5-3.png" | absolute_url }}){:height="400px" }

Kuvan kanban-taulu sallii maksimissaan, että sille on sijoitettu kaksikymmentä user storya. Kun story on kulkenut kaikkien työvaiheiden läpi, vapautuu kanban-taululle taas uutta kapasitettia, ja product owner voi sijoittaa seuraavaksi toteutettavan storyn vaiheeseen _input queue_.

Kuvan kanban-taulun WIP-rajoitteet eivät ole kovin tiukat, eli kesken olevan työn määrä on aika suuri, maksimissaan 15 storya. Koska lean pitää kesken olevaa työtä hukkana (in process inventory), ei _arvon virtaus_ olekaan kuvan kanban-taululla kovin optimaalista. Pienentämällä WIP-rajoja ja poistamalla välivarastoja saattaisikin olla mahdollisuus optimoida _läpimenoaikaa_, eli sitä aikaa, joka kuluu kun user story "tilataan", siihen kun sen määrittelemä ominaisuus on valmis.

Leanin ideaalin mukaista olisi toteuttaa ns. _one piece flow_, eli toimia siten että user storyt tehtäisiin kokonaisuudessaan valmiiksi ennen seuraavan user storyn aloittamista. Monissa paikoissa sovelletaankin tätä periaatetta, mutta jos työ on organisoitu huonosti, periaate saattaa johtaa liian alhaiseen _utilisaatioon_. Käytännössä tämä tarkoittaa, että softatiimin sisällä useat henkilöt joutuvat odottamaan toisten tekemisiä ennen kun he pystyvät jatkamaan omaa työtään. Tämän takia yhden storyn sijaan useimmissa tapauksissa tiimi työstää yhtä aikaa useampaa storyä. Eli sopivien WIP-rajoitteiden hakeminen vaatii aina tiimikohtaista harkintaa ja soveltamista.

### Leanin periaatteita

Jotta pull-järjestelmä toimisi hyvin, eli asiakkaan arvo virtaa tasaisesti, on edullista, jos eri työvaiheiden kestoon ei liity liikaa varianssia. Tähän liittyy leanin periaate _level the work_. Yksi kolmesta leanin hukan muodoista olikin _mura_ eli epäsäännöllisyys tai epäyhdenmukaisuus. Työvaiheiden keston tai ohjelmistokehityksen kontekstissa toteutettavien user storyjen koon suuri varianssi on eräs tämän ilmentymistä.

Eräs varianssin aiheuttaja ovat viat. Leanin periaatteita ovatkin _Stop and fix_ ja _build quality in_.

_Stop and fix_ viittaa Toyotan vanhaan periaatteeseen, missä kuka tahansa on velvollinen pysäyttämään tuotantolinjan vian, esimerkiksi vaurioituneen komponentin havaitessaan.

Tuotantolinjan pysäyttämisen yhteydessä _vian perimmäinen syy_ (engl. root cause) tulee selvittää mahdollisimman nopeasti (esimerkiksi äsken läpikäydyllä five whys -menetelmällä) ja pyrkiä eliminoimaan vian mahdollisuus tulevaisuudessa eli tuotannossa tulee olla laatu sisäänrakennettua _build quality in_.

Ohjelmistotuotannon käytänteistä automatisoitu testaus ja jatkuvan integraatio voidaan nähdä suoraan _stop and fix_ - ja _build quality in_ -periaatteiden ilmentymänä.

Perinteisessä massatuotannossa keskitytään pitämään tuotantolaitteistot käynnissä maksimikapasiteetilla ja työntekijät koko ajan työllistettyinä. Yksittäisten työntekijöiden palkkauskin perustuu usein suoritusbonuksiin. Näin ajatellaan, että tuotteiden yksikköhinta saadaan mahdollisimman alhaiseksi ja yrityksen tuottavuus maksimoituu.

Yksittäisten työntekijöiden ja koneiden tehokkuuden tarkastelun sijaan lean keskittyy arvon virtauksen optimoinnin avulla järjestelmien kokonaisvaltaiseen kehittämiseen ja olettaa, että se on pidemmällä tähtäimellä yritykselle kannattavampaa. Tämän kiteyttää periaate _long term philosophy_.

Esimerkiksi yksittäisen koneen suuri käyttöaste tai henkilökohtaisen suorituksen palkitseminen voi olla _lokaalia optimointia_, joka voi koko yrityksen kannalta olla jopa haitallista. Näin voidaan esimerkiksi valmistaa paljon komponentteja, joita ei lopulta koskaan tarvita. Yksittäisten tuotantolaitteiden, henkilöiden tai tiimien suorituskyvyn sijaan keskittymällä arvon virtaamiseen tilauksesta asiakkaalle pyritään toiminnan parannuksessa ottamaan huomioon koko tuotantosysteemiä koskevat pullonkaulat.

Surullisen kuuluisia esimerkkejä lokaalista optimoinnista on turhan paljon, mm. yliopistojen eri laitosten säästöt tilakustannuksista. Yliopiston rakennuksista maksama vuokra on edelleen sama vaikka jokin laitos "säästää" jättämällä tiloja käyttämättä.

Pull-systeemeissä ei ole tapana tehdä tuotantoon liittyviä päätöksiä (esim. miten paljon tuotetta ja sen tarvitsemia komponentteja tulee valmistaa) aikaisessa vaiheessa, vaan vasta tarpeen vaatiessa. Englanniksi tätä myöhäistä päätöksen tekemistä luonnehditaan _commit at the last responsible moment_, eli päätöksiä viivytetään, mutta ei kuitenkaan niin kauaa että viivyttely aiheuttaa ongelmia. Tämä kiteytyy periaatteessa _decide as late as possible_.

Kun päätös tehdään myöhään, on tästä se merkittävä etu, että päätöksen teon tueksi on käytettävissä maksimaalinen määrä tietoa, toisin kuin liian aikaisin etukäteen tehtävissä päätöksissä, mitkä ovat enemmän spekulatiivisia.

Kun päätökset on tehty, toimitaan pull-systeemin hengessä mahdollisimman nopeasti, eli
_implement rapidly_ tai _deliver as fast as possible_, näin arvo saadaan virtaamaan asiakkaalle ilman turhia viiveitä.

Mitä nopeammin arvo saadaan virtaamaan, sitä enemmän päätöksiä on mahdollista viivyttää ja päätökset voidaan tehdä entistä paremman tiedon valossa.

### Arvon virtaaminen ketterässä ohjelmistotuotannossa

Edellä mainittujen periaatteiden soveltaminen näkyy selkeästi ketterässä ohjelmistotuotannossa. Vaatimuksia hallitaan product backlogilla, joka on parhaassa tapauksessa [DEEP](/osa2#hyv%C3%A4-product-backlog-on-deep) eli Detailed appropriately, emergent, estimated, prioritized.

Alhaisen prioriteetin user storyja ei ole määritelty kovin tarkkaan. Kun product owner valitsee storyn seuraavaan sprinttiin toteutettavaksi, määritellään storyn hyväksymäkriteerit ja suunnitellaan se toteutuksen osalta. Tarkkoja vaatimuksia ei siis määritellä spekulatiivisesti vaan _at the last responsible moment_. Sprintiin valitut storyt toteutetaan valmiiksi sprintin aikana, eli _deliver as fast as possible_.

Scrum voidaankin nähdä leanin mukaisena _pull-systeeminä_, missä jokaiseen sprinttiin otetaan kerrallaan asiakkaan edustajan viime hetkellä (eli viimeistään sprint planningissa) määrittelemät tilaukset, jotka toteutetaan mahdollisimman nopeasti, eli sprintin aikana. Arvo, eli toimivaksi asti toteutetut uudet toiminnallisuudet, virtaa asiakkaalle sprinttien määrittelemässä rytmissä.

Ketterässä ohjelmistotuotannossa on viime aikoina ruvettu tehostamaan arvon virtausta usein eri menetelmin. Alun perin ja osin vieläkin Scrumin pyrkimys on viedä uusia ominaisuuksia tuotantoon sprinteittäin, eli muutaman viikon välein. Viime aikojen trendinä on ollut tihentää sykliä, [jatkuva käyttöönotto](/osa3#jatkuva-k%C3%A4ytt%C3%B6%C3%B6notto-ja-toimitusvalmius) eli _continuous deployment_ voi tarkoittaa, että jopa jokainen commit johtaa ohjelman uuden version julkaisuun, eli ohjelmistosta voi ilmestyä uutta arvoa tuottavia ominaisuuksia jopa kymmeniä kertoja päivässä.

Scrum rajoittaa kesken olevan työn määrää (joka on siis eräs leanin hukka) siten, että sprinttiin otetaan vaan tiimin velositeetin verran user storyja. Kaikissa konteksteissa, esimerkiksi jatkuvaa käyttöönottoa sovellettaessa aikarajoitettu sprintti ei ole mielekäs.

Paikoin onkin siirrytty "puhtaampaan" pull-systeemiin, missä user storyja toteutetaan yksi (tai joku hieman suurempi määrä) kerrallaan niin nopeasti kuin mahdollista. Kun story valmistuu eli tuotantokapasiteettia vapautuu, valitsee product owner seuraavaksi tärkeimmän storyn, joka sitten määritellään, suunnitellaan ja toteutetaan välittömästi alusta loppuun. Virtaus varmistetaan sillä, että yhtä aikaa työn alla ei ole kuin yksi tai korkeintaan muutama user story. [Osassa 2](/osa2#lean-waste-ja-scrumban) mainittu Scrumban-menetelmä toimii pitkälti juuri näin.

### Kasvattaminen leaniin ja johtajuuden periaatteet

Toyotalla useimmat uudet työntekijät koulutetaan huolellisesti perehtymään käytännön tasolla lean-ajattelun periaatteisiin. Useiden kuukausien koulutuksen aikana uudet työntekijät työskentelevät monissa eri työtehtävissä ja heidät opetetaan tunnistamaan lean-hukka sen eri muodoissa. Tarkoituksena on sisäistää jatkuvan parantamisen eli kaizenin mentaliteetti.

Toyotan johtamiskulttuurin keskiössä ovat lean-ajattelun opettajina, mentoreina ja työn valmentajina toimivat johtajat/managerit. Periaate _grow leaders_ kuvaa Toyotan tapaa kasvattaa lean-toimintafilosofian sisäistäviä managereja.

Periaate _my manager can do my job better than me_ kuvaa sitä, että managerit ovat firman sisällä eri työtehtävien kautta uusiin vastuisiin kasvaneita ihmisiä, jotka hallitsevat myös työntekijöiden vastuulla olevan _hands on_ -työn. Managerit ovat ensisijaisesti toiminnan etulinjassa toimivia lean-käytänteiden opettajia ja mentoreita.

Eräs tärkeä leanin johtamisen periaate on _go see_ (japaniksi genchi genbutsu): työntekijöiden, erityisesti managerien tulee "nähdä asiat omin silmin" eikä pelkästään istua työpöydän ääressä lukemassa muiden raportoimia faktoja. Tämä liittyy siihen ideaaliin, että managerien oletetaan _johtavan etulinjassa_ (japaniksi gemba) eli siellä missä työ tosiasiallisesti tehdään.

Toyota production systemsin kehittäjän T. Ohnon sanoin:

> You can’t come up with useful kaizen sitting at your desk... We have too many people these days who don’t understand the workplace. They think a lot, but they don’t see. I urge you to make a special effort to see what’s happening in the workplace. That’s where the facts are.

Scrum masterin rooli on osin leanin johtajuuden ideaalien mukainen. Tosin useimpiin scrum mastereihin ei päde periaate _my manager can do my job better than me_. Monissa kehitystiimeissä teknistä puolta johtajuudesta edustavat esim. lead developer tai senior developer -nimikkeellä olevat kokeneemmat mentorin roolissa toimivat työntekijät.

### Lean-tuotekehityksen periaatteita

Sovellettaessa leania _tuotantoon_ (engl. production), pääasiallisena fokuksena on toiminnan parantaminen hukkaa eliminoimalla.

Sovellettaessa leania tuotannon optimoinnin sijaan _tuotekehitykseen_ (development) esim. kokonaan uusien automallien suunnitteluun, nousee esiin kokonaan uusia periaatteita. Kantavana ideana Toyotan tuotekehityksessä on _out-learn the competitors, through generating more useful knowledge and using and remembering it effectively._

Leanissa tuotekehityksessä fokukseen nouseekin toiminnan tehostamisen lisäksi _oppimisen kiihdyttäminen_ (engl. _amplify learning_). Kannattaa pyrkiä mahdollisimman _arvokkaaseen tietoon_ (engl. _high-value information_), mm. kiinnittämällä huomio asioihin, mihin sisältyy paljon epävarmuutta (_focus on uncertain things_). Epävarmat ja suuren teknisen riskin sisältävät ideat kannattaa toteuttaa/testata nopeasti, niiden suhteen viivästyneellä tiedolla on korkea hinta (_cost of delay_).

Eräs leanin tuotekehityksen mekanismi oppimisen nopeuttamiseen on _set based concurrent
development_. Jos tarkoituksena on kehittää esim. uusi moottorin jäähdytysjärjestelmä, aletaan yhtä aikaa kehittämään useita vaihtoehtoisia ratkaisuja eri tiimien toimesta. Tasaisin väliajoin kehitettäviä ratkaisuja vertaillaan, ja osa niistä karsitaan. Lopulta parhaaksi osoittautuva ratkaisu valitaan käytettäväksi lopputuotteessa.

Set based development -menetelmä on radikaalisti erilainen kuin usein sovellettava _iteratiivinen_ kehitysmenetelmä, missä lähtökohtana on yksi askeleittain paranneltava ratkaisu.

Ohjelmistokehityksessä set based development -menetelmää sovelletaan melko harvoin, lähinnä käyttöliittymäsuunnittelussa esittelemällä asiakkaalle aluksi useita rinnakkaisia ehdotelmia mahdollisesta käyttöliittymäratkaisusta.

Toyotalla tuotekehitystä johtaa _chief technical engineer_, joka on vastuussa sekä tuotteiden teknisestä että liiketoiminnallisesta menestyksestä. Kyseessä on tyypillinen leanin etulinjassa toimiva johtaja, joka tuntee tarkasti käytännön työn, mutta on myös erittäin lähellä asiakasta. Rooli poikkeaa Scrumin _product ownerista_ teknisen taustansa takia.

### Leanin soveltaminen eri aloille

90-luvulta alkaen lean on herättänyt maailmalla suurta kiinnostusta ja sitä on pyritty soveltamaan lähes kaikilla aloilla ohjelmistokehitys mukaan lukien. Lean-periaatteet ovat olleet hyvin esim. Scrumin kehittäjien tiedossa ja vaikka Scrumin alkuperäiset lähteet eivät käytäkään leanin terminologiaa, on Scrumissa monin paikoin piirteitä leanista.

Viime aikainen ketterien menetelmien kehitys on vienyt tiettyjä ideoita, esimerkiksi user storyjen läpimenoaikojen minimointia huomattavasti Scrumin ja ketterän alkuaikojen käytänteitä pidemmälle. Nykyään puhutaankin paljon leanista ohjelmistokehityksestä.

Sekä ketterissä menetelmissä, että leanissa on sama fundamentaali periaate: _toimintojen jatkuva kehittäminen_. Rajanveto leanin ja ketterän välillä ei olekaan ollenkaan selvä ja se on osin täysin keinotekoista. Esimerkiksi Scrumin kehittäjät eivät ole missään nimessä tarkoittaneet Scrumia staattiseksi rakennelmaksi, jota noudatetaan kirjaimellisesti tästä ikuisuuteen, sellainen toiminta ei olisi ketteryyttä.
Ketteryyttä on _läpinäkyvyyden_ (engl. transparency) mahdollistava toimintojen jatkuvaan parantamiseen keskittyvä _inspect-and-adapt_-sykli. Käytännössä tämä on täsmälleen sama idea kuin leanin _kaizen_.

Leanin soveltamisessa on kohdattu myös paljon ongelmia. Lean on ajattelumalli, joka on kehitetty Toyotan tarpeisiin, malli on jalostunut ja muuttunut vuosikymmenten kuluessa.
Onkin osin epäselvää miten Toyotan käytänteet siirretään eri aloille.

Kuten ketterä, myös lean ei ole joukko työkaluja, vaan jatkuva toimintatapa, Toyotan CEO:n [Akio Toyodan](https://en.wikipedia.org/wiki/Akio_Toyoda) sanoin

- _The root of the Toyota Way is to be dissatisfied with the status quo; you have to ask constantly, "Why are we doing this?"_
- _In Toyota and in lean thinking, the idea is to repeat cycles of improvement experiments forever._

## Laajan skaalan ketterä ohjelmistokehitys

Ketterät ohjelmistotuotantomenetelmät ovat alunperin tarkoitettu pienten tiimien hallintaan. Esimerkiksi Scrum mainitsee kehitystiimin koostuvan 3-9:stä henkilöstä. Entä jos on kyseessä tuote, joka edellyttää suurempaa määrää kehittäjiä?

Perusperiaatteena on edelleen pitää tiimit pieninä, mutta kasvattaa tuotantokapasiteettia käyttämällä useampia tiimejä. Tämä taas edellyttää, että tiimien välistä työtä on koordinoitava jollain tavalla.

### Scrum of Scrums

Jo kauan käytetty tapa Scrumin skaalaamiseen on niin sanottu _Scrum of Scrums_, missä ideana on muodostaa koordinoiva tiimi, johon kuuluu yksi tai tarvittaessa useampikin jäsen jokaisesta Scrum-tiimistä. Perinteisin tapa lienee koostaa koordinointitiimi Scrum mastereista. Joissain tilanteissa parempi henkilö koordinointiin voi kuitenkin olla ns. lead developer, eli Scrum-tiimin kokeneempi sovelluskehittäjä. Scrum of Scrums -tiimi voi tavata joka päivä tai jos se ei ole tarpeen niin esimerkiksi viikoittain.

Scrum of Scrums -periaate on jo hyvin vanha. Artikkelissa [Agile Can Scale: Inventing and Reinventing SCRUM in Five Companies](https://www.researchgate.net/publication/290823579_Agile_Can_Scale_Inventing_and_Reinventing_SCRUM_in_Five_Companies) toinen Scrumin kehittäjistä Jeff Sutherland kertoo käyttäneensä Scrum of Scrumia jo vuonna 1996.

Sutherland sovelsi periaatetta firmassa, missä oli satoja sovelluskehittäjiä ja kymmeniä Scrum-tiimejä, joiden vastuulla oli useita eri tuotteita.

Jokaisen tuotteen tiimejä koordinoi oma, kerran viikossa kokoontuva Scrum of Scrums -tiimi. Koko firman tuotteiden joukkoa hallinnoi "management Scrum" eli Scrum of Scrum of Scrums -tiimi, joka kokoontui kuukausittain. Tämä ylimmän tason management Scrum-tiimi koostui yrityksen johdosta, tuotepäälliköistä ja johtavista ohjelmistoarkkitehdeistä.

Sutherlandin kuvaus ei ole kovin seikkaperäinen, ja se ei anna viitteitä miten esimerkiksi backlogien suhteen tulisi toimia laajemman skaalan Scrumissa.

### Laajan skaalan ketterät menetelmät

Viimeisen kymmenen vuoden aikana ketterän skaalaamiseen on alettu kiinnittämään enemmän huomiota ja on esitelty useita laajan mittakaavan ketteriä menetelmiä. Näistä eniten huomiota saaneet ovat Scaled Agile Framework eli
[SAFe](http://www.scaledagileframework.com), Large Scale Scrum eli [LeSS](https://less.works) ja jossain määrin myös Disciplined Agile eli [DA](http://www.disciplinedagiledelivery.com).

Yhteistä näille on se, että ne laajentavat ketteryyttä ottamalla mukaan lean-ajattelua. Toisin kuin ketterät menetelmät, lean on lähtökohtaisesti tarkoitettu toimimaan todella suuressa skaalassa ja se sisältääkin enemmän koko organisaation toimintaa ohjaavia periaatteita kuin perinteinen ketterä. Käsitellään nyt hieman tarkemmin SAFe:a ja LeSS:iä. DA on listatuista menetelmistä vähimmälle huomiolle jäänyt, joten jätämme sen välistä.

### SAFe eli Scaled Agile Framework

Scaled Agile Framework eli SAFe on tämän hetken suosituin laajan mittakaavan ketterä menetelmä, [erään tutkimuksen](https://www.cprime.com/resource/white-papers/scaling-agile-survey-2017/) mukaan 45 % laajan mittakaavan ketterää kehitystä tekevistä organisaatiota hyödyntää SAFe:a, joka on tällä hetkellä käytössä myös Helsingin yliopiston opetushallinnon tietojärjestelmien ja web-palveluiden kehityksessä.

SAFe:n pääasiallinen kehittäjä on David Leffingwell, joka toimi Nokia Mobile Phonesissa (NMP) konsulttina 2000-luvulla. SAFe on syntynyt pitkälti Nokialla tehdyn työn pohjalta. Nokialla oli käytössä eräänlainen SAFe:n esiversio. SAFe:n virallinen ensimmäinen versio julkaistiin 2011. Tällä hetkellä on menossa versio 6.

Kärjistetysti sanoen SAFe yhdistää kaikki viimeisen 20 vuoden aikana kehitetyt ketterän ja leanin ohjelmistokehityksen parhaat käytänteet sekä joukon yrityksien tuotteiden hallinnointiin suunnattuja käytänteitä.

SAFe tarjoaa suuren määrän periaatteita (engl. principles), henkilö- ja tiimirooleja sekä käsitteitä. SAFe kutsuu itseään menetelmäkehykseksi (engl. framework) eli tarkoitus on, että yritykset räätälöivät itselleen sopivanlaisen prosessin käyttäen SAFe:n tarjoamia työkaluja.

SAFe tarjoaa myös neljä erikokoista valmiiksi räätälöityä konfiguraatiota. Näistä pienin _Essential SAFe_ on tarkoitettu pienemmille yrityksille ja SAFe:n soveltamisen alkuvaiheeseen. Konfiguraatioista suurin _Full SAFe_ taas soveltuu massiivisten, useita eri tuotteita hallitsevan yrityksen käyttöön. Seuraava kuva havainnollistaa Full SAFen käsitteistöä:

![]({{ "/images/5-4.png" | absolute_url }}){:height="500px" }

Sovelluskehityksen ytimessä (löydätkö sen kuvasta?) on SAFe:n hieman modifioima Scrum, johon on liitetty joukko XP:n periaatteita.

Tiimien koordinointia hallitaan ylhäältä päin (engl. top down) kokoamalla yhdestä tuotteesta vastaavien tiimien joukko käsitteen _toimitusjuna_ (engl. release train) alle. Release trainin Scrum-tiimit toimivat synkronissa toistensa kanssa tuottaen yhdessä isompia toiminnallisia useammasta sprintistä koostuvan _product increment_ -jakson aikana.

Product incrementtejä ja niitä toteuttavia release traineja taas ohjaillaan yhä korkeammalta organisaatiosta erilaisten henkilöroolien toimesta. SAFe tarjoaa tähänkin paljon tukea käsitteistön ja määrittämiensä roolien kautta.

SAFe on dokumentoitu todella tarkasti ja se antaa erittäin yksityiskohtaista ohjeistusta helpottamaan SAFe:n käyttöönottoa ja noudattamista. Ohjeistusta antavat tietysti kallispalkkaiset konsultit ja räätälöidyt koulutuspaketit ja sertifiointi.

SAFe vaikuttaa olevan erityisesti firmojen johdon suosiossa. Tämä on ymmärrettävää, sillä toisin kuin useimmat ketterät menetelmät, SAFe tarjoaa firman managementille sopivasti tekemistä roolien ja käytänteiden muodossa.

Kuten aiemmin mainittu, sisältää SAFe käytännössä kaikki mahdolliset ketterän ja lean-ohjelmistokehityksen parhaat käytänteet vieläpä selkeästi ja yksityiskohtaisesti dokumentoituna. SAFe onkin eräänlainen agile/lean-kehityksen supermarket, kaikki on helposti saatavissa valmiina pakatussa muodossa. Pick and mix, avaa paketti ja seuraa käyttöohjetta...

SAFe on saanut osakseen myös paljon kritiikkiä. Osa kritiikistä kohdistuu SAFe:n määrittelemän prosessin raskauteen, osa taas SAFe:n top down -management luonteeseen.

Esim. Scrumin kehittäjä Ken Schwaber on [kyseenalaistanut sen, onko SAFe ylipäätään ketterä menetelmä](https://kenschwaber.wordpress.com/2013/08/06/unsafe-at-any-speed/) ketteryyden alkuperäisen idean mukaan. Agile Manifestissahan on periaate _individuals and Interactions Over Processes and Tools_. SAFe taas prosessina vaikuttaa kovin raskaalta.

### LeSS eli Large Scale Scrum

LeSS:in taustalla on Craig Larman ja Bas Vodde, jotka työskentelivät konsultteina 2000-luvun alussa mm. Nokia Siemens Networksilla. Toisin kuin SAFe, LeSS on erittäin yksinkertainen, hyvin vahvasti Scrumiin pohjautuva. Uusia rooleja, artifakteja ja palavereja ei ole.

LeSSistä on kaksi eri versiota, _LeSS_ tilanteisiin, missä tuotetta tekee 2-8 Scrum-tiimiä ja _LeSS Huge_ tilanteisiin, missä tiimejä tarvitaan suurempi määrä.

Sekä LeSS että LeSS Huge perustuvat seuraaville oletuksille

- kehitetään yhtä tuotetta, jolla on yksi product owner ja yksi product backlog
- kaikilla tiimeillä on samaan aikaan etenevät sprintit
- tiimit ovat Scrumin tapaan cross-functional ja full-stack eli ne sisältävät kaiken tarvittavan kompetenssin kokonaisen tuotteen osan tekemiseen
- tiimit tekevät sprintin aikana yhdessä tuotteesta yhden uuden ja julkaisuvalmiin asiakkaalle arvoa tuottavan version (engl. one shippable product increment)

Yksi LeSS-toteutus on tarkoitettu siis yhden tuotteen kehittämiseen. Jos yrityksellä on useita eri tuotteita, niitä kutakin varten on oma LeSS-toteutuksensa, Toisin kuin SAFe, LeSS ei ota mitenkään kantaa siihen miten firma hallinnoi tuoteperheitään.

LeSS korostaa, että kyseessä _ei_ ole erillinen Scrumin päälle lisätty hallinnollinen kerros vaan ainoastaan tapa miten Scrumin periaatteita ja artefakteja voidaan soveltaa mahdollisimman yksinkertaisella tavalla laajemmassa skaalassa.

#### LeSS:in taustalla olevat periaatteet

LeSS:in taustalla on joukko tuttuja ketterän ja lean-kehityksen periaatteita.

![]({{ "/images/5-5.png" | absolute_url }}){:height="440px" }

Periaatteet ovat lähes samat kuin SAFe:ssa, yksi periaatteista tekee kuitenkin selvää eroa menetelmien välille, esitetään se tässä suorana sitaattina [dokumentaatiosta](https://less.works/less/framework/introduction.html#LeSSPrinciples)

_More with less:_

- We don’t want more roles because more roles leads to less responsibility to Teams
- We don’t want more artifacts because more artifacts leads to a greater distance between Teams and customers
- We don’t want more process because that leads to less learning and team ownership of process, instead we want more responsible Teams by having less (fewer) roles
- We want more customer-focused Teams building useful products by having less artifacts
- We want more Team ownership of process and more meaningful work by having less defined processes.
- _We want more with less_

Eli minimoimalla prosessin, roolien ja artefaktien määrää pyritään siihen että tiimit ottavat itse omistajuuden tuotteen kehittämisestä ja asiakkaan kanssa käytävästä kommunikaatiosta.

Lisää periaatteista [LeSS:in](https://less.works/less/framework/introduction.html) dokumentaatiossa.

#### LeSS käytännössä

Katsotaan hieman tarkemmin LeSS:in pienempää konfiguraatiota, joka on tarkoitettu noin 2-8 tiimin hallintaan.

Henkilöroolit ovat samat kuin normaalissa Scrumissa. Product ownereita on yksi, Scrum mastereita voi olla muutamia riippuen tiimien määrästä, yksi scrum master pystyy hoitamaan järkevästi noin 1-3 tiimin asioita.

Tiimit ovat itseorganisoituvia _full-stack, feature-tiimejä_, eli jokainen tiimi keskittyy asiakkaalle arvoa tuottavien kokonaisuuksien toteuttamiseen. Tiimijako siis _ei noudata_ sovelluksen arkkitehtuurisia kerroksia, eli ei ole esimerkiksi erillisiä frontend-, backend- ja tietokantatiimejä. Kukin tiimi operoi ohjelmiston kaikilla tasoilla toteuttaen alusta loppuun user storyjen kuvaaman toiminnallisuuden definition of donen tasolla.

Myös artefaktit ovat samat kuin normaalissa Scrumissa. Product backlogeja on yksi, sprint backlog sen sijaan on jokaisella tiimillä oma. Kaikki tiimit työstävät sprintin aikana samaa ohjelmistoa, _potentially shippable product increment_ eli sprintin tuotoksena oleva ohjelmiston valmiiksi asti tehty laajennus on kaikille tiimeille sama.

![]({{ "/images/5-6.png" | absolute_url }}){:height="350px" }

Sprintin suunnittelu eli sprint planning on normaalista Scrumista poiketen kaksiosainen.

Ensimmäisessä osassa product owner ja kaikkien tiimien edustajat valitsevat product backlogilta eri tiimille seuraavan sprintin aikana toteutettavat user storyt.

Suunnittelun toinen osa on tiimikohtainen. Kukin tiimi muodostaa oman sprint backlogin, jonka avulla sprintin sisäinen toiminta hallitaan normaalin scrumin tapaan. Tarpeen vaatiessa tosin useampikin tiimi voi toimia sprintin aikana synkronissa, käyttäen yhteistä sprint backlogia.

![]({{ "/images/5-7.png" | absolute_url }}){:height="350px" }

Kaikkien tiimien yhteinen aikaansaannos (one shippable product increment) katselmoidaan yhdessä. Retrospektiivi taas on kaksitasoinen, ensin pidetään normaalin scrumin tapaan tiimikohtainen retrospektiivi ja tämän jälkeen koko tuotteen valmistusprosessia tarkasteleva overall-retrospektiivi, missä on edustus kaikista tiimeistä ja mahdollisesti yrityksen johdosta.

![]({{ "/images/5-8.png" | absolute_url }}){:height="350px" }

#### Muu tiimien välinen koordinointi

Kaikille tiimeille yhteisen sprintin suunnittelun ensimmäisen osan, sprint reviewin ja overall-retrospektiivin lisäksi LeSS ei edellytä muita tiimien väliseen koordinaatioon tarkoitettuja yhteisiä tapaamisia, vaan toteaa että tiimit päättävät keskenään miten koordinaatio tapahtuu.

LeSS antaa joukon aiheeseen liittyviä ohjeita ja suosituksia:

- Prefer decentralized and informal coordination over centralized coordination
- Emphasize _just talk_ and informal networks via communicate in code, cross-team meetings, component mentors, travelers, scouts, and open spaces

Periaate _just talk_ korostaa suoran kommunikoinnin tärkeyttä, _communicate in code_ tarkoittaa ryhmien välistä työskentelyä helpottavaa ohjelmointitapaa, esimerkiksi yhteisiä koodikäytänteitä sekä jatkuvaa integraatiota. _Scouteilla_ tarkoitetaan muiden tiimien daily scrumissa vierailemista.

LeSS mainitsee myös scrum of scrums -palaverit yhtenä mahdollisena tiimienvälisen koordinoinnin muotona, mutta suosittelee mielummin epämuodollisempia kommunikaation muotoja.

#### Backlogin ylläpito

Scrum olettaa, että noin 5-10% sprintin työskentelystä käytetään backlog groomingiin, jonka tarkoituksena siis pitää backlog [DEEP](/osa2#hyv%C3%A4-product-backlog-on-deep):inä. Toisin kuin Scrum, LeSS kiinnittää eksplisiittisesti huomioita backlogin ylläpitämiseen ja antaa aiheeseen liittyvää ohjeistusta.

Product owner on vastuussa backlogista, ja hoitaa kaiken priorisoinnin. Backlogin ylläpidossa (grooming/refinement) tulee olla mukana myös kaikkien tiimien, sekä sovelluksen eri sidosryhmien edustajia. Oletusarvoisesti kukin tiimi hoitaa niiden storyjen tarkentamista, mitkä tiimi tulee todennäköisesti toteuttamaan. Tarpeen mukaan tiimit kuitenkin järjestävät yhteisiä backlogin groomaustilaisuuksia tarkastellessaan toisiinsa läheisesti liittyvien storyjen tarkennusta tai miettiessään sovelluksen kehityksen suurempiin linjauksiin, esimerkiksi arkkitehtuuriin vaikuttavia asioita.

LeSS kannustaa kehitystiimejä kommunikoimaan mahdollisimman suoraan asiakkaiden tai loppukäyttäjien kanssa.

#### LeSS Huge

Jos tiimien määrä on suurempi kuin kahdeksan, suositellaan käytettäväksi _LeSS Huge_ -versiota. Edelleen oletetaan että kehitettävänä on ainoastaan yksi tuote, jolla on yksi product backlog sekä yksi vastuunalainen product owner.

Backlog kuitenkin jaetaan nyt _vaatimusalueisiin_ (engl. requirement area), joista jokaiselle on siitä vastuun kantava _area product owner_. Area product ownerit muodostavat tuotteen kokonaisuutta hallinnoiva _product owner -tiimin_, joka toimii koko tuotteen product ownerin johdolla.

![]({{ "/images/5-9.png" | absolute_url }}){:height="380px" }

#### LeSS vs SAFe

On erittäin mielenkiintoista että molemmat SAFe ja LeSS ovat pitkälti syntyneet Suomessa ja Nokialla. Nokian organisaatiorakenteen takia Nokia Mobile Phonesin (NMP) ja Nokia Siemens Networksin (NSN) ohjelmistokehityksen tapa oli kuitenkin täysin erilainen, ja SAFe (NMP) ja LeSS (NSN) ovat samoista taustaperiaatteista ja yhteisestä syntykonsernista huolimatta hyvin erilaisia menetelmiä.

Molempien menetelmien kanssa työskennelleiden konsulttien Aki Tikka ja Ran Nyman kirjoittama [menetelmien vertailu](https://gosei.fi/blog/less-safe-comparison/) kannattaa lukea.

Kuten aiemmin todettiin, SAFe on suosittu yritysjohdon keskuudessa, mutta saanut paljon kritiikkiä arvovaltaisten ketterän kehityksen edustajien toimesta. En myöskään itse ole kuullut kenenkään sovelluskehittäjän kehuvan SAFe:a.

En tiedä kuvastaako se mitään menetelmien pitkän tähtäimen toimivuudesta, mutta SAFe:n kotia Nokia Mobile Phonesia ei enää ole olemassakaan. Nokia (Siemens) Networks taas on nykyinen Nokia ja soveltaa edelleen LeSS-menetelmää.

### Spotifyn ketterän skaalaamisen viitekehys

Henrik Knibergin 2012 ilmestynyt artikkeli [Scaling Agile @ Spotify](https://blog.crisp.se/wp-content/uploads/2012/11/SpotifyScaling.pdf) kertoi suurelle yleisölle miten ruotsalainen musiikkistreamauspalvelu Spotify onnistui skaalaamaan toimintansa noin neljän vuoden aikana muutamasta sovelluskehittäjästä useaan sataan, eri kaupungeissa työskentelevään softakehittäjään säilyttäen toiminnassaan startupmaisen ketteryyden.

Spotifyn "malli" on melko yksinkertainen, se organisoi kehittäjät _tiimeihin_ (squad) jotka taas jakautuvat eri _heimoihin_ (tribe). Tiimi/heimorakenteen lisäksi malli sisältää myös hieman toisenlaisen jaottelun, jossa firman ihmiset jaotellaan heimojen sisällä _jaostoihin_ (chapter) sekä heimorajat ylittäviin _kiltoihin_ (guild):

![]({{ "/images/5-17.png" | absolute_url }}){:height="380px" }

Vaikka Knibergin kuvauksen tarkoituksena ei ollutkaan se, että _muut firmat_ alkaisivat imitoimaan Spotifyn tapaa, näin kuitenkin kävi.

Käydään nyt hieman tarkemmalla tasolla läpi Spotifyn mallia, tai sitä miltä se näytti noin vuonna 2012 ja siitä muutaman vuoden eteenpäin.

#### Squad eli tiimi

Spotifyn mallin ytimessä on noin 5-10 hengen tiimi, josta käytetään englanninkielistä termiä _squad_, joka lienee suomeksi joukkue tai ryhmä. Puhumme tässä kuitenkin tiimistä sillä se lienee squadeista yleisimmin suomeksi käytetty termi.

Tiimit ovat ketterän ideaalin tapaan _cross-functional_, eli ne sisältävät kaiken tietotaidon vastuullaan olevien ohjelmiston osien saamisesta aina ideasta tuotantoympäristöön asti. Tiimit ovat täysin itseorganisoituvia, ja ne päättävät vapaasti omista työnteon käytänteistään. Tiimit voivat esim. käyttää sisäisesti Scrumia, Kanbania, Scrumbania tai mitä tahansa muuta työskentelyn tapaa. Koko tiimi työskentelee samassa työtilassa.

![]({{ "/images/5-18.png" | absolute_url }}){:height="250px" }

Kunkin tiimin vastuulla on jokin looginen osa sovellusta. Usein tämä sovelluksen osa on jokin suoraan asiakkaalle näkyvä, ja itsenäisesti arvoa tuottava palanen, Spotifyn tiimit ovat siis ehdottomasti _feature-teameja_, samoin kuin LeSS-kehitysmallissa.

Tiimin vastuulla saattaa olla esim. Spotifyn iPhone-sovellus, käyttäjän soittolista, päivän suositukset -toiminnallisuus tai laskutustoiminnot. Osalla tiimeistä vastuulla taas on enemmän Spotifyn muiden tiimien sisäisesti hyödyntäviä asioita, kuten esimerkiksi backendin eli taustajärjestelmän riittävän suorituskyvyn varmistaminen.

Seuraava kuva havainnollistaa sitä kuinka tiimin vastuulla on usein jopa konkreettinen palanen käyttöliittymän tarjoamasta toiminnallisuudesta:

![]({{ "/images/5-19.png" | absolute_url }}){:height="345px" }

Tiimeillä on _product owner_, joka huolehtii että tiimin vastuulla olevaa sovelluksen osaa kehitetään kokonaisuuden kannalta järkevään suuntaan. Käsitettä _scrum master_ ei Spotifyllä tunneta. Tiimien apuna toimivat _agile coachit_, eli ketteryyden valmentajat, joiden vastuulla on tavanomaisia scrum mastereiden vastuita alkaen palaverien järjestämisestä retrospektiivien fasilitointiin. Coachit auttavat myös teknisissä asioissa ja antavat tarvittaessa vaikkapa yksilöllistä uraohjausta tiimien jäsenille.

Tiimien on tarkoitus toimia mahdollisimman startupmaisesti, ja olla suorassa yhteydessä loppukäyttäjiin. Tiimien pyrkimyksenä on hyödyntää [Lean startup -menetelmästä](/osa2) tuttuja MVP:itä ja A/B-testausta validoidessaan uusien kehitettävien toiminnallisuuksien hyödyllisyyttä.

Tiimeillä on valta tehdä jossain määrin liiketoimintaankin liittyviä päätöksiä varsin autonomisesti. Tälle perusteena on se, että koska Spotifyn pitää pystyä toimimaan mahdollisimman nopeasti haastavilla markkinoilla, myös päätöksenteon pitää olla nopeaa ja jopa tiimitasolla tapahtuvaa. Toimiakseen se taas edellyttää vahvaa yhteistä visioa sovelluksen kehityssuunnasta, ja selkeitä mittareita siitä mihin suuntaan kehitystä on vietävä. Spotifyllä monien asioiden käyttökelpoisuutta on helpohko mitata asiakasmetriikoiden esim. päivittäisten aktiivisten käyttäjien lukumäärän avulla.

Tiimien toimivuutta ja toimintaolosuhteita mitataan muutaman kuukauden välein. Mittareina ovat

- suhde _product owneriin_ ja _agile coacheihin_: onko saatava tuen määrä riittävä, annetaanko tiimille esim. liikaa painetta tuotteen kehittämiseen koodin laadun kustannuksella
- missä määrin tiimi ja sen jäsenet pystyvät itse vaikuttamaan työskentelyn tapoihin (_influencing work_)
- onko tiimin helppo julkaista tekemänsä muutokset tuotantoon (_easy to release_); tämä on erityisen tärkeä komponentti, sillä tiheä julkaisutahti on oleellista tuotteen nopean A/B-testaukseen perustuvan kehittämisen kannalta
- onko tiimin käyttämä kehitysprosessi optimaalinen tiimin tarpeisiin nähden (_process fits the team_)
- onko tiimin _missio_, eli työtä ohjaava isompi tavoite selkeä
- onko muun _organisaation tuki_ riittävä, niin teknisten kuin vähemmän teknisten ongelmien ratkaisun suhteen

Tiimien mittareiden trendejä seurataan, jotta ongelmakohtiin myös puututtaisiin sopivin toimenpitein.

![]({{ "/images/5-24.png" | absolute_url }}){:height="245px" }

#### Tribe eli heimo

Ideaalina on, että kukin tiimi on mahdollisimman itsenäinen yksikkönsä joka voi toimia ilman riippuvuutta muista tiimeistä. Tiimien välillä on kuitenkin väkisin riippuvuutta, ja myös synergiaa. Samojen aihepiirin ympärillä työskentelevät tiimit onkin jaettu _heimoihin_ (engl. tribe):

![]({{ "/images/5-20.png" | absolute_url }}){:height="380px" }

Spotifyn tiimit työskentelevät samassa tilassa. Kaikkien heimon tiimien on myös tarkoituksena työskennellä lähekkäin, samassa rakennuksessa tai jopa samassa kerroksessa. Tämä mahdollistaa helpon ja epämuodollisen kanssakäymisen heimon tiimien välillä.

Heimoon kuuluu maksimissaan kymmenkunta tiimiä sillä heimojen koko halutaan pitää maksimissaan sadassa henkilössä. Luku 100 perustuu ns. [Dunbarin lukuun](https://en.wikipedia.org/wiki/Dunbar's_number), joka on on teoreettinen kognitiivinen raja ihmisten lukumäärälle, johon keskiverto ihmisyksilö voi ylläpitää pysyviä sosiaalisia suhteita. On siis idea että heimolaiset tuntevat enemmän tai vähemmän kaikki toinen toisensa.

Kniberg perustelee heimon kokoa myös seuraavasti: _When groups get too big, we start seeing more things like restrictive rules, bureaucracy, politics, extra layers of management, and other waste._ Eli pitämällä heimon koko suunnilleen Dunbarin luvun rajoissa, on se vielä mahdollista hallita hyvin kevyesti, ilman turhan monimutkaista ja monikerroksista organisaatiota.

Heimot pitävät aika ajoin yhteisiä kokoontumisia, missä heimon tiimit esittelevät toisilleen aikaansaannoksiaan sekä oman kehityksensä suuntaa.

Sellaiset tiimit, jotka tekevät samaan teemaan liittyviä kokonaisuuksia, ja joiden tulee kommunikoida usein, on mielekästä sijoittaa samaan heimoon. Näin tiimien keskinäinen kommunikointi ja tiedonvaihto helpottuu sillä jo määritelmänsä mukaan kaikki heimon tiimit työskentelevät lähekkäin, samassa rakennuksessa ja mieluiten vieläpä samassa kerroksessa.

#### Chapter eli jaosto

Jakautuminen mahdollisimman autonomisiin tiimeihin on hyvä sikäli että sen ansiosta kunkin tiimin on mahdollista edetä nopeasti kohti liiketoiminnallisia tavoitteita. Negatiivisena puolena autonomiasta taas on se, että samoja ongelmia saatetaan joutua ratkomaan kerta toisensa jälkeen eri tiimien sisällä ja yhden tiimin oppimat asiat eivät automaattisesti leviä muihin tiimeihin.

Eliminoidakseen tätä uhkaa Spotify on lanseerannut _jaostot_ (engl. chapter) jotka koostuvat yhden heimon niistä jäsenistä joilla on samankaltainen osaamisalue. Esim. heimon eri tiimien testaajat voisivat muodostaa oman jaostonsa, samoin kaikki frontend-kehittäjät:

![]({{ "/images/5-21.png" | absolute_url }}){:height="320px" }

Jaostot järjestävät enemmän tai vähemmän säännöllisiä tapaamisia, joissa jaoston jäsenet keskustelevast eri tiimien kohtaamista ongelmista ja eri puolilla kehitetyistä ratkaisuista. Näin esim. yhden tiimin sisällä kehitetyt testaukseen liittyvät hyvät käytänteet saadaan leviämään muihin tiimeihin. Kutakin jaostoa johtaa _chapter lead_, eli senioriteettia omaava jaoston jäsen, joka on kuitenkin itsekin mukana jossain tiimissä, eli kyse _ei ole_ jaostoon dedikoidusta johtajasta.

Tiimit ja jaostot siis palvelevat isossa kuvassa samaa suurta tavoitetta, mutta hieman eri dimensioilla. Product owner vastaa kysymykseen _what to build next_, eli ohjaa tuotteen kehityssuuntaa. Jaosto, erityisesti jaoston _lead_ (termi jolle en keksi hyvää suomenkielistä vastinetta) taas pyrkii tarjoamaan tukea kysymykseen "how to build it well". Jaosto myös tukee jäsentensä ammatillista kehittymistä.

![]({{ "/images/5-23.png" | absolute_url }}){:height="280px" }

#### Guild eli kilta

Jaostot siis koostuvat yhden _heimon_ sisällä olevista saman kompetenssin omaavista henkilöistä. Kilta (engl. guild) on heimon tapainen mutta yli heimorajojen toimiva saman kompetenssin tai intressin omaavien henkilöiden ryhmä. Esimerkiksi testaajien kilta koostuu kaikkien testausjaostojen jäsenistä mutta myös muut asiasta kiinnostuneet, esim. web-kehittäjät voivat osallistua killan järjestämiin tapahtumiin.

![]({{ "/images/5-22.png" | absolute_url }}){:height="360px" }

#### Spotifyn mallin soveltaminen ja kritiikki

Spotifyn mallia on ruvettu soveltamaan monin paikoin muissakin yrityksissä. Spotifyn skaalaamisen tavan dokumentoineen ja maailmalle esitelleen Henrik Knibergin [mukaan](https://blog.crisp.se/2015/06/07/henrikkniberg/no-i-didnt-invent-the-spotify-model) Spotifyn mallia ei ollut tarkoitettu muualla sovellettavaksi, ja hänen mukaansa ei edes ole mitään Spotifyn mallia, sillä sovelluskehityksen tapa muuttuu Spotifyllä koko ajan, mukautuen yhä kasvavan yrityksen tarpeisiin.

Spotify on sittemmin lisännyt malliinsa muutaman uuden organisatoorisen komponentin (trio ja allianssi) joiden avulla pystytään hallitsemaan kehityksen suuntaa isossa kuvassa. Spotifyllä on myös muutamia yli kaikkien heimojen toimivia henkilörooleja, mm. _chief architect_ eli henkilö, joka vastaa koko tuotteen arkkitehtuurista.

Spotifyn mallille on annettu internetissä [rajuakin](https://www.linkedin.com/pulse/spotify-sucks-erwin-verweij/) [kritiikkiä](https://www.jeremiahlee.com/posts/failed-squad-goals/). Onkin ilmeistä, että Spotifyn toiminta on kohdannut monia vaikeuksia firman kasvettua nopeasti ja tämä on johtanut Spotifyn mallin (mikäli mitään mallia siis voi edes sanoa olevan olemassa) muutoksiin ja mitä ilmeisemmin muokannut firman toimintaa kohti [perinteisempää jäykempää korporaatiota](https://www.youtube.com/watch?v=ar4lq1l8pAc&t=2462s&ab_channel=QAgileQualityinAgile).

Spotifyn mallia sovellettaessa on siis hyvä pitää mielessä että sen ei todellakaan ole tarkoitettu olevan staattinen rakennelma, jonka voi kopioida kirjaimellisesti toiseen kontekstiin. Moni asia Spotifyn mallissa onkin ainoastaan uusi nimi jollekin vanhalle tutulle asialle, jotka löytyvät suoraan esim. Scrumista, Leanista, SAFe:sta tai LeSS:istä, ja voikin olla viisaampi kääntyä suoraan näiden menetelmien kirjallisuuden pariin.

Spotifyn mallin suosion on osin arveltu johtuvan [sädekehävaikutuksesta (engl. halo effect)](https://fi.wikipedia.org/wiki/S%C3%A4dekeh%C3%A4vaikutus), eli myönteinen mielikuva Spotifystä tuotteena on saattanut olla osin sen takana, että on alettu myös kopioimaan ilman sen suurempia perusteita myös firman tapaa toimia. Tämä siitäkin huolimatta, että oman yrityksen toimintaympäristössä ei ole mitään Spotifyn toimintaympäristöä muistuttavaa.

Spotifyn mallia, tai ainakin sen käyttämää terminologiaa on omaksuttu käyttöön myös monessa suomalaisessa yrityksessä, mm. [Smartly](https://www.smartly.io/) soveltaa tiettyjä mallin piirteitä varsin suurella menestyksellä.

Jos Spotifyn malli kiinnostaa, kannattaa ehdottomasti katsoa [tämä](https://www.youtube.com/watch?v=Yvfz4HGtoPc&ab_channel=HenrikKniberg) ja [tämä](https://www.youtube.com/watch?v=vOt4BbWLWQw&ab_channel=HenrikKniberg) aihetta käsittelevä Youtube-video. Jos haluat myös kurkistaa Spotifyn osittain sotkuiseenkin todellisuuteen, kannattaa katsoa myös Joakim Sundénin esitelmä [You can do better than the Spotify Model](https://www.youtube.com/watch?v=gL6ou9UwqUQ&ab_channel=PreziConferenceTeam).

## Ketterien menetelmien käyttö ja hyödyt tutkimuksen valossa

Tehdään vielä kurssin lopussa nopea katsaus ketterien menetelmien käyttöön ja hyötyihin liittyvään tutkimukseen.

### Miten laajasti ketteriä menetelmiä käytetään

Internetistä löytyy melko paljon erilaisia kyselytutkimuksia, jotka kartoittavat ketterien menetelmien käytön yleisyyttä.

Max Steinmetzin [artikkeli vuodelta 2018](https://www.targetprocess.com/blog/agile-statistics/) referoi useampaa eri kyselytutkimusta, joista löytyy erilaisia lukemia siitä kuinka laajasti ketteriä menetelmiä käytetään ohjelmistoprojekteissa. Pienin prosentti löytyy [Project Management Instituten](https://www.pmi.org/-/media/pmi/documents/public/pdf/learning/thought-leadership/pulse/pulse-of-the-profession-2018.pdf) kyselystä, jonka mukaan 46% ohjelmistoprojekteista tehdään ketterillä menetelmillä. [Stack owerflowin](https://insights.stackoverflow.com/survey/2018#development-practices) yli sadan tuhannen vastaajan kyselyssä tulos oli, että kyselyyn vastanneista 85.9 % työskenteli ketterillä menetelmillä.

Googlaamalla löytyy runsaasti lisää erilaisia kyselyjä, ja kaikissa ketteryyden käyttöaste sijoittuu suunnilleen näiden kahden prosenttilukeman väliin, useimmiten reilusti viidenkymmenen yläpuolelle.

Valtaosa internetissä olevista kyselyistä ei täytä tieteellisen tutkimuksen kriteerejä: niiden tutkimusten otokset eivät ole välttämättä koko populaatiota edustavia ja tutkimusmetodologia voi olla kyseenalainen. Osa tutkimusten tekijöistä on kaupallisia toimijoita, joiden intressinä saattaa olla itselleen suosiollisten tulosten julkaisu.

Aiheesta on tehty myös jonkun verran tieteellistä tutkimusta. Oulun yliopiston tutkijoiden vuonna 2012 julkaiseman artikkelin [Survey on Agile and Lean usage in Finnish software industry](http://esem.cs.lth.se/industry_public/Rodriguezetal_ESEM2012_IndustryTrack_1_0.pdf) mukaan 58 % tutkimukseen osallistuneista 200 suomalaisesta yrityksestä ilmoitti käyttävänsä ketteriä tai lean-menetelmiä ohjelmistokehityksessä.

Loppuvuodesta 2016 julkaistussa Brasiliassa, Suomessa ja Uudessa-Seelannissa tehdyssä tutkimuksessa [Adoption and Suitability of Software Development Methods and Practices](https://ieeexplore.ieee.org/document/7890614/) päädyttiin seuraaviin lukuihin eri menetelmien käytön osalta

- Scrum 71.2 %
- Kanban 49.5 %
- Lean 39.7 %
- vesiputous 35.3 %

Helsingin yliopiston ja Nitorin loppuvuodesta 2018 tekemän [selvityksen mukaan](https://www.nitor.com/fi/uutiset-ja-blogi/nitor-ja-helsingin-yliopisto-selvittivat-suomalaisyritykset-ketteryyden-edellakavijoita) ainoastaan 5.9 % vastaajista ilmoitti että ketterät menetelmät eivät ole yrityksessä ollenkaan käytössä:

![]({{ "/images/5-9a.png" | absolute_url }}){:height="300px" }

Kuten lukemat osoittavat, ketterä kehitys valtaa alaa. Sama trendi on näkyvissä Yhdysvaltojen hallituksen alaisissa ohjelmistoprojekteissa, joissa hitaan liikkeellelähdön jälkeen [agile on noussut](https://www2.deloitte.com/insights/us/en/industry/public-sector/agile-in-government-by-the-numbers.html) dominoivaan asemaan.

![]({{ "/images/5-10.png" | absolute_url }}){:height="300px" }

### State of Agile -raportti

Jo 15 vuoden ajan ilmestynyt [State of Agile](https://www.stateofagile.com) -raportti tarjoaa paljon mielenkiintoista tilastotietoa ketterien menetelmien käytöstä. Raportin mukaan Scrum dominoi ketterien menetelmien kenttää.

![]({{ "/images/5-11-2021.png" | absolute_url }}){:height="300px" }

Scrumia ja sen johdannaisia käyttää siis 82 % vastaajista. Extreme programmingin (eli XP) osuus on enää marginaalinen 1%.

Ketterien projektinhallintakäytänteiden osuus näytti seuraavalta:

![]({{ "/images/5-12-2021.png" | absolute_url }}){:height="400px" }

_Daily standup_ -palaverit on edellisten vuosien tapaan kärjessä. Vastanneista 63 % ilmottaa että käytössä on _short iterations_. Tutkimus ei valitettavasti erittele sitä miten pitkä on _short_, mutta vastaus on joka tapauksessa hieman yllättävä. Ainakin itse olettaisin että ketterien menetelmien käytössä _short iterations_ on suorastaan edellytys. Jos iteraatiot ovat pitkiä, esim. useamman kuukauden mittaisia, ei voida kunnolla puhua enää ketteryydestä ja käytössä saattaa olla jopa pahamaineinen [ScrumBut](/osa1#scrumin-ongelmia).

Ketterien teknisten käytänteiden osalta tilanne näyttää seuraavalta:

![]({{ "/images/5-13-2020.png" | absolute_url }}){:height="400px" }

Tämäkin lista on osin hieman yllättävä, sillä voisi esimerkiksi olettaa että jatkuva integrointi olisi nykyään lähes kaikkialla käytössä, mutta ainoastaan 55 % ilmoittaa käyttävänsä sitä.

Tämän kyselyn tietojen valossa teknisten käytänteiden suhteen todella monella näyttäisi olevan skarppaamisen paikka. Osan 3 luvussa [Tieteellinen evidenssi](/osa3/#tieteellinen-evidenssi) referoitu laaja tutkimushan osoitti hyvin selkeästi sen miten tekniset käytenteet (mm. automatisoidut testit, jatkuva integraatio ja jatkuva tuotantoonvienti) vaikuttavat positiivisesti sekä työhyvinvointiin että organisaatioiden tehokkuuteen.

Sama tutkimus osoitti myös, että tiettyjen teknisten käytänteiden lisäksi organisaatioiden tehokkuutta parantaa mm. pienissä toimituserissä työskentely (work in small batches) ja keskeneräisen työn määrän rajoittaminen (limit work in process). State of Agilen tutkimuksessa mukana olleista kuitenkaan 37 % _ei käytä_ lyhyitä iteraatioita ja 49 % _ei julkaise_ sovelluksesta uusia versiota usein (frequent releases), eli ketteryyden potentiaalisia hyötyjä ei selvästikkään ulosmitata täydessä mitassaan läheskään kaikissa organisaatioissa.

### Toimiiko ketterä ohjelmistokehitys

Ohjelmistoprojektin hallinnointimenetelmistä tutkimusta tekevä [Standish Group](https://www.standishgroup.com/) on julkaissut vuodesta 1995 alkaen ohjelmistoprojektien onnistumisen astetta kartoittavaa _Chaos Reportia_.

Raportti jakaa projektit onnistumisen suhteen kolmeen ryhmään:

- _successful_: projekti on _onnistunut_ jos se valmistuu aikataulussa, budjetoituun hintaan ja suunnitellussa laajuudessa
- _challenged_: projektin onnistuminen on _vaarantunut_, jos jokin onnistumisen komponenteista _aikataulu, budjetti, laajuus_ ei ole toteutunut, esimerkiksi jos sovellus on valmistunut aikataulussa, pysyy budjetin puitteissa, mutta kaikkea suunniteltua toiminnallisuutta ei ole toteutettu
- _failed_: projekti on _epäonnistunut_ jos se ei valmistu, tai sitä ei oteta koskaan käyttöön

Vuoden 2018 raportissa projektien onnistumisen aste näyttää seuraavalta:

![]({{ "/images/5-14.png" | absolute_url }}){:height="150px" }

Projektin koolla on todella suuri merkitys onnistumisen kannalta. Jos tarkastelussa otetaan huomioon projektin koko, on onnistumisprosentti seuraavanlainen:

![]({{ "/images/5-15.png" | absolute_url }}){:height="220px" }

Ketterät menetelmät näyttävät siis toimivan vesiputousmallia paremmin projektin koosta riippumatta, mutta ero kasvaa kun projektien koko kasvaa.

[State of Agile](https://www.stateofagile.com) -raportti erittelee tarkemmin ketteryydellä saavutettuja hyötyjä:

![]({{ "/images/5-16-2021.png" | absolute_url }}){:height="400px" }

### Johtopäätöksiä

Evidenssiä ketterien menetelmien toimimisesta siis on. Näyttö ei kuitenkaan ole täysin kiistatonta, sillä kaikki edellä referoidut tutkimukset ovat kyselytutkimuksia, joissa käsitteistöä ei ole välttämättä kunnolla määritelty (esim. mitä ketteryydellä tai projektin onnistumisella tarkoitetaan) ja kyselyyn osallistuneet eivät useimmiten edusta tasaisesti koko populaatiota. Kaikkien kyselyjen tekijät eivät myöskään ole puolueettomia menetelmien suhteen, esim. State of Agile -raporttia tuottava [CollabNet/VersionOne](https://www.collab.net/) on ketteriä projektinhallintatyökaluja tuottava yritys. Tutkimusten validiteetti siis on hieman kyseenalainen.

Ketteristä menetelmistä on tehty myös runsaasti akateemista tutkimusta, muutama näistä mainittiinkin edellä tekstissä. Akateemisenkin tutkimuksen systemaattisuus, laatu ja tulosten yleistettävyys vaihtelee. Osan kolme luvussa [Tieteellinen evidenssi](/osa3/#tieteellinen-evidenssi) referoitu tutkimus lienee kattavin tällä hetkellä olemassa oleva ketterien ja lean-periaatteiden hyötyjä erittelevä tutkimus.

Olemassa on myös suuri määrä tutkimuksia, joissa rajaudutaan yksittäisten tekniikoiden, esim TDD:n, pariohjelmoinnin tai jatkuvan integraation hyötyjen mittaamiseen. Ohjelmistotuotannossa on kuitenkin liian paljon muuttujia, jotta jonkin yksittäisen tekijän vaikutusta voitaisiin täysin vakuuttavasti mitata empiirisesti. Menetelmiä soveltavat aina ihmiset, ja mittaustulos yhdellä ohjelmistotiimillä ei välttämättä yleisty mihinkään muihin olosuhteisiin.

Lähes kaikissa yksittäisen tekniikan esim. TDD:n hyötyjä mittaavissa tutkimuksissa ongelmana on se, että ne eivät mittaa tekniikoista saatavia pitkäaikaisia hyötyjä mm. ohjelmiston ylläpidolle ja jatkokehitettävyydelle. Sekä kansanviisaus että monet tutkimukset ovat todenneet, että valtaosa ohjelmiston kustannuksista muodostuu juurikin ylläpitovaiheen, eli ensimmäisen version julkaisun jälkeisistä kustannuksista. Esimerkiksi [tämä](https://www.researchgate.net/publication/221408114_Distribution_of_Cost_over_the_Application_Lifecycle_-_a_Multi-case_Study) tutkimus päätyy siihen, että peräti 79 % ohjelmiston kustannuksista muodostuu ylläpitovaiheen aikana. Onkin mahdollista, että jokin tekniikka tuottaa lyhytaikaisen hyödyn, mutta jopa heikentää tuottavuutta pitkällä aikavälillä.
