---
layout: page
permalink: /poetry
title: Poetry ja riippuvuuksien hallinta
---

_Tämä ohje on kopio kurssin Ohjelmistotekniikka [Poetry-ohjeesta](https://ohjelmistotekniikka-hy.github.io/python/viikko2#poetry-ja-riippuvuuksien-hallinta) ohjeesta muutamin lisäyksin_

Laajoissa ja monimutkaisissa ohjelmistoprojekteissa kaiken koodin tuottaminen itse ei ole enää käytännöllistä. Ei ole esimerkiksi järkevää, että jokaisessa ohjelmistoprojektissa toteutetaan oma ohjelmointirajapinta tietokantaoperaatioille, tai sovelluskehys koodin testaamiseen. Jotta pyörää ei tarvitsisi aina keksiä uudelleen, ovat ohjelmistokehittäjät kehittäneet valtavan määrän avoimen lähdekoodin _kirjastoja_, joita jokainen voi hyödyntää projekteissaan.

Kirjastojen lähdekoodi on usein luettavissa versionhallinta-alustoilla, kuten GitHubissa. Usein kirjastoja päivitetään jatkuvasti ja nämä päivitykset synnyttävät kirjastoista uusia _versioita_. Kirjastojen versioita julkaistaan erilaisiin rekistereihin, joista ne ovat helposti asennettavissa. [The Python Package Index](https://pypi.org/) (PyPI) on eräs tämän kaltainen, Python-kirjastoille tarkoitettu rekisteri.

Projektissa käytettävät kirjastojen versiot ovat projektin _riippuvuuksia_. Riippuvuuksia asennetaan Python-projekteissa tyypillisesti projektikohtaisiin _virtuaaliympäristöihin_, jottei samalla tietokoneella olevien projektien riippuvuuksissa syntyisi ristiriitoja. Jotta riippuvuuksien hallinta virtuaaliympäristöissä sujuisi helposti, käytämme kurssilla [Poetry](https://python-poetry.org/)-komentorivityökalua.

### Huomioita komennoista

Monilla tietokoneilla Python-version kolme komennot suoritetaan `python3`-komennolla komennon `python` sijaan. Tarkista käytössä oleva versio komennolla:

```bash
python3 --version
```

Jos komentoa `python3` ei jostain syystä löydy, tarkista `python`-komennon käyttämä versio komennolla:

```bash
python --version
```

Jos molemmissa tapauksissa versio on alle 3.10, asenna tietokoneellesi [uusin Python-versio](https://www.python.org/downloads/). Muista varmistaa asennuksen jälkeen, että oikea versio on käytössä. Muussa tapauksessa käytä komentoa, jonka käyttämä versio on vähintään 3.10.

_Kurssilla käytetään Poetryn versiota 1.6.1. Jos koneellasi on vanhempi versio, se on syytä päivittää!_

### Asennus

Ennen kuin pääsemme tutustumaan Poetryn käyttöön tarkemmin, tulee se ensin asentaa. Seuraa alla olevista ohjeista tietokoneesi käyttöjärjestelmälle sopivaa asennusohjetta, kannattaa toki vilkaista myös Poetryn [virallinen](https://python-poetry.org/docs/) asennusohje.

**HUOM:** kaikki asennustavat saattavat vaatia terminaali-ikkunan sulkemisen ja uudelleen avaamisen, jotta Poetryn komennot alkavat toimia. Joissain tapauksissa on vaadittu jopa tietokoneen uudelleenkäynnistys.

#### Linux- ja macOS-asennus

Asenna Poetry suorittamalla terminaalissa seuraava komento:

```bash
curl -sSL https://install.python-poetry.org | POETRY_HOME=$HOME/.local python3 -
```

**HUOM:** jos `python3`-komentoa ei löydy, käytä sen sijaan komennon lopussa `python`-komentoa. Varmista kuitenkin, että Python-versio on oikea edellisen ohjeen mukaisesti.

**HUOM:** jos törmäät macOS-tietokoneella virheeseen `SSL: CERTIFICATE_VERIFY_FAILED`, avaa Python-asennuksen hakemisto komenolla `open /Applications/Python\ 3.9` (korvaa "3.9" käytössä olevalla Python-versiolla) ja klikkaa hakemistossa olevaa tiedostoa _Install Certificates.command_. Odota, että operaatio valmistuu ja suorita tämän jälkeen edellä mainittu asennus-komento uudestaan.

Asennuksen jälkeen Poetry-binäärin polku tulee asettaa `PATH`-muuttujaan. Tämä onnistuu lisäämällä kotihakemiston _.bashrc_-tiedoston loppuun seuraava rivi:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Lisääminen onnistuu esimerkiksi muokkaamalla tiedostoa nano-editorin avulla, tai suorittamalla seuraava komento:

```bash
echo "export PATH=\"\$HOME/.local/bin:\$PATH\"" >> $HOME/.bashrc
```

**HUOM:** jos käytössäsi on zsh-komentorivi, on oikea konfiguraatiotiedosto _.bashrc_-tiedoston sijaan _.zshrc_-tiedosto. Voit tarkistaa käytössä olevan komentirivin komennolla `echo $SHELL`. Käytä tässä tapauksessa edellisessä komennossa käytetyn `$HOME/.bashrc`-polun sijaan polkua `$HOME/.zshrc`.

**HUOM:** jos käytössäsi on macOS-käyttöjärjestelmä ja bash-komentorivi, käytä edellisessä komennossa käytetyn `$HOME/.bashrc`-polun sijaan polkua `$HOME/.bash_profile`.

**HUOM:** käytä melkki-palvelimella edellisessä komennossa käytetyn `$HOME/.bashrc`-polun sijaan polkua `$HOME/.profile`.

Käynnistä terminaali uudestaan ja varmista, että asennus onnistui suorittamalla komento `poetry --version`. Komennon pitäisi tulostaa asennettu versio.

#### Windows-asennus

Asenna Poetry suorittamalla terminaalissa seuraava komento:

```powershell
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | py -
```

Asennuksen jälkeen Poetry-binäärin polku tulee asettaa `PATH`-muuttujaan. Lisää [tämän](https://www.architectryan.com/2018/03/17/add-to-the-path-on-windows-10/) ohjeen mukaisesti `PATH`-muuttujaan polku `%APPDATA%\Python\Scripts`.

Käynnistä terminaali uudestaan ja varmista, että asennus onnistui suorittamalla komento `poetry --version`. Komennon pitäisi tulostaa asennettu versio.

#### Poetry ja Docker

**HUOM:** Poetrya ei ole pakko asentaa Dockerilla. Jos käytät fuksiläppäriä, Poetry on todennäköisesti jo asennettu koneellesi.

Ehkä paras tapa Poetryllä tapahtuvaan sovelluskehitykeen on [Dockerin](https://www.docker.com/) käyttö. Tällöin et tarvitse koneellesi muuta kuin Dockerin, mitään varsinaista asennusta ei tarvita sillä voit käyttää kurssia varten konfiguroitua Docker imagea [mluukkai/poetry](https://hub.docker.com/repository/docker/mluukkai/poetry/general), ks myös [GitHub-repositorio](https://github.com/mluukkai/docker-poetry).

Poetryn käyttö tapahtuu seuraavasti. Mene hakemistoon, missä haluat suorittaa Poetry-komentoja. Joudut (todennäköisesti) antamaan hakemiston sisältöön kirjoitus- lukuoikeudet Dockerille komennolla:

```
chmod  o=rw .
```

Anna komento

```
docker run -it --volume="$PWD:/mydir" mluukkai/poetry:intel
```

Jos koneesi on M1 mac, komennon muoto on seuraava:

```
docker run -it --volume="$PWD:/mydir" mluukkai/poetry:m1
```

Komento avaa komentotulkin Docker-konttiin, missä kaikki Poetry-komennot, esim. `poetry init`, `poetry add`, `poetry shell` ym. ovat käytettävissä. Kontti näkee kaikki käynnistyshakemistossa olevat tiedostot. Voit editoida tiedostoja normaaliin tapaan tekstieditorilla kontin ulkopuolella. Docker-kontissa oleva komentotulkki sulkeutuu komennolla `exit`.

Lisää Dockerista kurssilla [Devops with Docker](https://devopswithdocker.com/).

#### Docker ja Robot-testit

Web-sovelluksia testatessa käytä imagen [mluukkai/poetry](https://hub.docker.com/repository/docker/mluukkai/poetry) sijaan imagea [mluukkai/poetry-robot](https://hub.docker.com/repository/docker/mluukkai/poetry-robot/). Image toimii ainoastaan intelin prosessoriarkkitehtuurilla varustetuilla koneilla, eli M1 käyttäjät joutuvat etsimään jonkun muun ratkaisun...

Jotta kontissa suoritettu web-sovellus näkyisi isäntäkoneelle, tulee konttia käynnistettäessä julkaista kontin portti 5001 (missä sovellus toimii) isäntäkoneen porttiin. Tämä tapahtuu seuraavasti:

```bash
docker run -it -p 5001:5001 --volume="$PWD:/mydir" mluukkai/poetry-robot
```

Robot-testit suoritetaan menemällä komennolla `docker exec` samaan kontiin, missä sovellus on jo päällä:

```bash
docker exec -it kontainerintunnistetahan bash
```

Kontainerin tunniste selviää komennolla `docker ps`.

Testit toimivat valitettavasti ainoastaan ns. headless modessa, jonka saat päälle [tehtävän 7](/tehtavat3/#7-web-sovelluksen-testaaminen-osa-3) alussa neuvotulla tavalla.

Testit on mahdollista saada toimimaan myös siten että testejä suorittava selain näytetään. Tämä vaatii kuitenkin erinäistä säätöä, googlaa jos kiinnostaa esim. hakusanoilla [linux docker gui apps](https://www.google.com/search?q=linux+docker+gui+apps).

### Ongelmia Poetryn asennuksessa?

Tämän sivun [lopussa](/poetry#ratkaisuja-yleisiin-ongelmiin) on ohjeita muutamiin ongelmatilanteisiin.

### Asetusten hienosäätö

Ennen kuin aloitamme Poetryn käytön, tehdään pieni muutos konfiguraatioihin.

Näemme käytössä olevat konfiguraatiot komennolla `poetry config --list`, jonka tulostus näyttää seuraavalta

```bash
cache-dir = "/Users/mluukkai/Library/Caches/pypoetry"
experimental.system-git-client = false
installer.max-workers = null
installer.modern-installation = true
installer.no-binary = null
installer.parallel = true
virtualenvs.create = true
virtualenvs.in-project = false
virtualenvs.options.always-copy = false
virtualenvs.options.no-pip = false
virtualenvs.options.no-setuptools = false
virtualenvs.options.system-site-packages = false
virtualenvs.path = "{cache-dir}/virtualenvs"  # /Users/mluukkai/Library/Caches/pypoetry/virtualenvs
virtualenvs.prefer-active-python = false
virtualenvs.prompt = "{project_name}-py{python_version}"
```

Konfiguraatioissa on pari meitä kiinnostava kohtaa. _cache-dir_ ja _virtualenvs.path_ kertovat yhdessä, että jokaisen projektin virtuaaliympäristo, eli talletetaan oletusarvoisesti kansion _/Users/mluukkai/Library/Caches/pypoetry_ alle. Tämä voi olla ok ratkaisu, mutta ainakin omaan makuun parempi on jos kunkin projektin virtuaaliympäristö talletetaan projektin hakemistoon. Tämä on yleinen käytäntö esimerkiksi JavaScritp-ekosysteemissä. Konfiguraatio tapahtuu [seuraavasti](https://python-poetry.org/docs/configuration/#virtualenvsin-project)

```bash
poetry config virtualenvs.in-project true
```

Komennon `poetry config --list` tulostuksessa pitäisi nyt olla seuraava rivi:

```bash
virtualenvs.in-project = true
```

### Projektin alustaminen

Harjoitellaan Poetryn käyttöä tekemällä pieni esimerkkiprojekti. Luo hakemisto _poetry-testi_ haluamaasi hakemistoon. Hakemiston ei tarvitse löytyä Labtooliin rekisteröimästäsi repositoriosta. Avaa hakemisto terminaalissa ja suorita siellä komento:

```bash
poetry init --python "^3.10"
```

Komennon yhteydessä annettu `--python "^3.10"`-asetus asettaa projektin Python-version vaatimukseksi vähintään version 3.10. Komennon suorittaminen alkaa kysymään kysymyksiä. Voit vastata kysymyksiin haluamallasi tavalla ja kaikkien kohtien vastauksia voi myös muokata myöhemmin. Tämän vuoksi kysymysten ohittaminen Enter-painiketta painamalla on täysin hyvä vaihtoehto.

Kun viimeiseen kysymykseen on vastattu, katso hakemiston sisältöä. Hakemistoon pitäisi ilmestyä _pyproject.toml_-tiedosto, jonka sisältö on kutakuinkin seuraava:

```
[tool.poetry]
name = "poetry-testi"
version = "0.1.0"
description = ""
authors = ["Matti Luukkainen <matti.luukkainen@helsinki.fi>"]
readme = "README.md"

[tool.poetry.dependencies]
python = "^3.10"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

Tiedoston `[tool.poetry]`-osio sisältää projektiin liittyviä yleistietoja, kuten sen nimen, kuvauksen ja ylläpitäjät. Osion alapuolella on osioita, jotka listaavat projektin riippuvuuksia. Osiossa `[tool.poetry.dependencies]` näemme `poetry init`-komennon suorituksen yhteydessä asettamamme Python-version vaatimuksen, joka on muotoa `python = "^3.10"`. `^3.10`-merkintä tarkoittaa, että projektin käyttö vaatii vähintään Python-version 3.10.

Kun _pyproject.toml_-tiedosto on tullut tutuksi, viimeistellään projektin alustaminen suorittamalla komento:

```bash
poetry install
```

Komennon suorittaminen tekee projektille vaadittavat alustustoimenpiteet, kuten virtuaaliympäristön alustamisen ja riippuvuuksien asentamisen. Tämän vuoksi komento tulee suorittaa aina ennen kuin uutta projektia aletaan käyttämään.

Komennon suorittaminen saattaa johtaa seuraavaan ilmoitukseen:

```
Installing the current project: poetry-testi (0.1.0)
The current project could not be installed: [Errno 2] No such file or directory: '~/poetry-testi/README.md'
If you do not want to install the current project use --no-root
```

Tämä johtuu siitä, että Poetry yrittää asentaa myös nykyistä projektia, eikä projektissa ole _poetry-testi_-nimistä moduulia. Kyseessä [ei ole](https://github.com/python-poetry/poetry/pull/8369) tekstin ulkonäöstä huolimatta virhe vaan pikemminkin varoitus. Projektin alustaminen on kyllä mennyt läpi, mutta jos et halua varoitusta, voit käyttää komennosta muotoa:

```bash
poetry install --no-root
```

Virtuaaliympäristön alustamisen lisäksi tämä komento asentaa ainoastaan projektin riippuvuudet, ei projektia itseään.

Komennon suorittamisen `poetry install` jälkeen hakemistoon pitäisi ilmestyä tiedosto _poetry.lock_. Tiedosto sisältää kaikkien asennettujen riippuvuuksien versiotiedot. Sen tietojen avulla Poetry pystyy aina asentamaan `poetry install` -komennolla riippuvuuksista täsmälleen oikeat versiot. Tästä syystä tiedosto tulee lisätä versionhallintaan.

Tekemiemme [asetusten muutosten](/poetry#asetusten-hienosäätö) takia hakemistoon tulee myös tiedosto _.venv_ johon Poetry tallentaa projektin virtuaaliympäristön riippuvuuksineen. Tätä tiedostoa _ei tule tallentaa_ versionhallintaan, eli se on syytä lisätä heti tiedostoon _.gitignore_.

Kannattaa huomata, että hakemistoa _.venv_ ei oletusarvoisesti näe komennolla _ls_, sillä Unix-tyyppisissä käyttöjärjestelmissä pisteellä alkavat ovat [piilotiedostoja](https://help.ubuntu.com/stable/ubuntu-help/files-hidden.html.en). Komento _ls -a_ tuo näkyviin myös piilotiedostot/hakemistot. Vielä parempi muoto voi olla, _ls -la_, joka tulostaa tiedot hieman laajemmassa muodossa:

![]({{ "/images/lh1-venv.png" | absolute_url }}){:height="350px" }

### Riippuvuuksien asentaminen

{% include no_pip.md %}

Asennetaan seuraavaksi projektiimme ensimmäisen riippuvuus. Riippuvuuksien löytäminen onnistuu helpoiten Googlettamalla ja etsimällä hakutuloksista sopivia GitHub-repositorioita, tai PyPI-sivuja. Asennetaan esimerkkinä projektiimme [cowsay](https://pypi.org/project/cowsay/)-kirjasto. Tämä onnistu projektin juurihakemistossa (samassa hakemistossa, missä _pyproject.toml_-tiedosto sijaitsee) komennolla:

```bash
poetry add cowsay
```

Asennuksen komento on siis muotoa `poetry add <kirjasto>`. Komennon suorittamisen jälkeen huomaamme, että _pyproject.toml_-tiedoston `[tool.poetry.dependencies]`-osion alla on uutta sisältöä:

```
[tool.poetry.dependencies]
python = "^3.10"
cowsay = "^2.0.3"
```

`poetry add`-komento asentaa oletusarvoisesti kirjaston uusimman version, joka oli komennon suoritushetkellä `2.0.3`. Usein tämä on juuri se, mitä haluamme tehdä. Voimme kuitenkin asentaa halutessamme esimerkiksi cowsay-kirjaston version `1.0` komennolla:

```bash
poetry add cowsay==1.0
```

Jos haluaisimme poistaa kirjaston projektimme riippuvuuksien joukosta, se onnistuisi komennolla:

```bash
poetry remove cowsay
```

Pidetään kuitenkin cowsay-kirjasto toistaiseksi asennettuna.

### Komentojen suorittaminen virtuaaliympäristössä

Lisätään seuraavaksi _poetry-testi_-hakemistoon hakemisto _src_ ja sinne tiedosto _index.py_. Lisätään tiedostoon seuraavat koodirivit:

```python
import cowsay

cowsay.tux("Poetry is awesome!")
```

Koodissa käyttämme `import`-lausetta saadaksemme cowsay-kirjaston käyttöömme. Jos suoritamme tiedoston terminaalissa komennolla:

```bash
python3 src/index.py
```

On lopputuloksena seuravaa virheilmoitus:

```
ModuleNotFoundError: No module named 'cowsay'
```

Tämä johtuu siitä, että emme ole projektin virtuaaliympäristön sisällä, jonka vuoksi Python ei löydä projektimme riippuvuuksia. Asia korjaantuu käyttämällä [run](https://python-poetry.org/docs/cli/#run) komentoa:

```bash
poetry run python3 src/index.py
```

`poetry run`-komento siis suorittaa annetun komennon virtuaaliympäristössä, jonka sisällä Python löytää riippuvuutemme.

Kun projektia kehitetään aktiivisesti ja komentoja suoritetaan terminaalissa jatkuvasti, on kätevintä olla koko ajan virtuaaliympäristön sisällä. Voimme siirtyä virtuaaliympäristön sisään kommennolla [shell](https://python-poetry.org/docs/cli/#shell):

```bash
poetry shell
```

Kun olemme virtuaaliympäristössä, komentorivin syöterivin edessä on suluissa virtuaaliympäristön nimi:

```bash
$ (poetry-testi-IhtScY6W-py3.9)
```

Virtuaaliympäristön sisällä voimme suorittaa komennon "normaalisti", eli ilman `run`-komentoa:

```bash
python3 src/index.py
```

Voimme lähteä virtuaaliympäristöstä komennolla `exit`.

Poetry:n tuodut riippuvuudet ovat vain virtuaalisessa ympäristössä saatavilla, VS Code:in sisäänrakennettu "debugging mode" (F5 oletuksena) ei välttämättä toimi. Koita ensin `poetry shell` ja vasta sen jälkeen käynnistä VS Code `code /path/to/projekt` komennolla.

### Kehityksen aikaiset riippuvuudet

Poetryn avulla riippuvuuksia on mahdollista ryhmitellä niiden käyttötarkoituksen mukaan. Melko yleinen tapa ryhmitellä riippuuvuuksia on ryhmitellä ne _kehityksen_ ja _suorituksen_ aikaisiksi riippuvuuksiksi. Kehityksen aikaisia riippuvuuksia tarvitaan ohjelmiston kehityksen aikana, mutta ne eivät ole välttämättömiä ohjelman suorituksessa.

Komennon `poetry add` suorittaminen asentaa oletusarvoisesti riippuvuudet `[tool.poetry.dependencies]`-osion alle. Näiden riippuvuuksien lisäksi voimme asentaa projektiimme riippuvuuksia, joita tarvitsemme vain kehityksen aikana. Näitä riippuvuuksia ovat kaikki ne, joita itse sovelluksen käynnistäminen (esimerkiksi `python3 src/index.py`-komennon suorittaminen) ei tarvitse.

Kehityksen aikaisten riippuvuuksien asentaminen onnistuu antamalla `poetry add`-komennolle `--group dev`-flagi. Esimerkiksi pian tutuksi tulevan [pytest](https://pytest.org/)-kirjaston voi asentaa kehityksen aikaiseksi riippuvuudeksi seuraavalla komennolla:

```bash
poetry add pytest --group dev
```

Komennon suorittaminen lisää pytest-kirjaston riippuvuudeksi `[tool.poetry.group.dev.dependencies]`-osion alle:

```
[tool.poetry.group.dev.dependencies]
pytest = "^7.4.2"
```

Kehityksen aikaisten riippuvuuksien määritteleminen on kätevää, koska se vähentää asennettavien riippuvuuksien määrää tapauksessa, jossa haluamme vain suorittaa sovelluksen. Tässä tilanteessa riippuvuuksien asentamisen voi tehdä komennolla `poetry install --without dev`.

{% include no_pip.md %}

### Ratkaisuja yleisiin ongelmiin

Muistithan, että ennen kuin voit suorittaa komennon, esim.

```
pytest src/tests
```

tulee aktivoida virtuaaliympäristö, eli antaa komento

```
poetry shell
```

Jos tästä huolimatta tulee valitus siitä, että ohjelman käyttämä kirjasto ei löydy (ja kirjasto on varmuudella asennettu), asenna riippuvuudet ja virtuaaliympäristö uudelleen, eli anna komennot:

```
rm -rf .venv
rm poetry.lock
poetry install
```

Yritä tämän jälkeen uudelleen!

#### muita ongelmia

Usein Poetry-ongelmat ratkeavat seuraavilla toimenpiteillä:

1. Varmista, että Poetrysta on asennettu uusin versio suorittamalla komento `poetry self update`
2. Varmista, että _pyproject.toml_-tiedostossa on oikea Python version vaatimus:

   ```
   [tool.poetry.dependencies]
   python = "^3.10"
   ```

   **Jos versio on väärä**, muuta se oikeaksi ja suorita komento `poetry update`

3. Tyhjennä välimuisti suorittamalla komennot `poetry cache clear pypi --all` ja `poetry cache clear PyPi --all`

4. Listaa projektissa käytössä olevat virtuaaliympäristöt komennolla `poetry env list` ja poista ne kaikki yksitellen komennolla `poetry env remove <nimi>`. Esimerkiksi seuraavasti:

   ```bash
   $ poetry env list
   unicafe-jLeQYxxf-py3.9 (Activated)
   $ poetry env remove unicafe-jLeQYxxf-py3.9
   Deleted virtualenv: /Users/kalleilv/Library/Caches/pypoetry/virtualenvs/unicafe-jLeQYxxf-py3.9
   ```

   Kun virtuaaliympäristöt on poistettu, suorita komento `poetry install`

Kun kaikki toimenpiteet on suoritettu, yritä suorittaa epäonnistunut Poetry-komento uudestaan.

#### Keyring-ongelma

Jos `poetry install`-komennon suorittaminen pyytää keyring-salasanaa, ongelma pitäisi ratketa suorittamalla terminaalissa `export PYTHON_KEYRING_BACKEND=keyring.backends.fail.Keyring` ja sen jälkeen suorittamalla komento `poetry install` uudestaan. Kyseisen rivin voi laittaa _.bashrc_ (tai vastaavaan) tiedostoon, jotta sitä ei tarvitse suorittaa jokaisen terminaali-istunnon aluksi.
