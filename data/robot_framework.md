---
layout: page
title: Robot Framework
inheader: no
permalink: /robot_framework/
---

[Robot Framework](https://robotframework.org/) on user storyjen hyväksymistestauksen automatisointiin hyvin soveltuva sovelluskehys. Robot Frameworkin avulla user storyjen testit voidaan kirjoittaa asiakkaan ymmärtämässä muodossa, luonnollisella kielellä, mutta tehdä niistä kuitenkin automaattisesti suoritettavia.

Vaikka Robot Framework on perinteisesti tarkoitettu koko ohjelmiston "end-to-end"-testaukseen, tarkastellaan ensin Robot Frameworkin toimintaperiaatteita testaamalla yksittäistä luokkaa. Hae [kurssirepositorion](https://github.com/ohjelmistotuotanto-hy/tehtavat/tree/main/viikko3/hello-robot) hakemistossa _koodi/viikko3/hello-robot_ oleva projekti.

- Kopioi projekti palatusrepositorioosi, hakemiston _viikko3_ sisälle.

Testattavana on yksinkertainen laskuri:

```python
class Counter:
    def __init__(self, initial_value=0):
        self.initial_value = initial_value
        self.value = initial_value

    def increase(self):
        self.value = self.value + 1

    def increment(self, amount):
        self.value = self.value + amount

    def decrease(self):
        self.value = self.value - 1

    def reset(self):
        self.value = self.initial_value
```

Laskurille on toteutettu Robot Frameworkin avulla muutama testi _src/tests_-hakemiston <i>increase_counter.robot</i>-tiedostoon. Tutustu tiedoston sisältöön ja pohdi, vaatiiko testattavien skenaarioiden ymmärtäminen lukijalta erityistä teknistä osaamista esimerkiksi unittest-testeihin verrattuna.

Robot Frameworkin käyttö onnistuu Pythonilla [robotframework](https://pypi.org/project/robotframework/)-kirjaston avulla, joka on määritelty projektin riippuvuudeksi. Ota projekti käyttöön asentamalla sen riippuvuudet komennolla `poetry install`. Suorita tämän jälkeen testit siirtymällä virtuaaliympäristöön komennolla `poetry shell` ja suorittamalla siellä komento `robot src/tests`.

Testien suorittamisen jälkeen komentoriville ilmestyy lyhyt raportti testien suorituksesta. Tämän raportin lisäksi projektin juurihakemiston tiedostoon _report.html_ ilmestyy yksityiskohtaisempi, HTML-muotoinen raportti. Klikkailemalla raporttia, avautuu mukava testien suorituksen statusta kuvaava näkymä:

![]({{ "/images/lh3-robot.png" | absolute_url }})

### Vaatimuksien ilmaiseminen

Laskurin haluttua toiminnallisuutta kuvaavat seuraavat user storyt

- As a user I want to be able to increase the counter value
- As a user I want to be able to set the counter to value zero

Robot Framework testaamisen ytimessä on niin kutsutut _avainsanat_ (keywords). Avainsana on selkokielinen selitys tehtävästä asiasta. Esimerkiksi laskurin testaamisen kannalta yksi erittäin oleellinen avainsana on `Increase Counter`, jonka avulla laskurin arvoa voidaan kasvattaa. Avainsanoilla voi olla myös _argumentteja_ (arguments), jotka tekevät niistä uudelleenkäytettäviä. Argumenteilla varustettu avainsana voisi olla esimerkiksi `Counter Value Should Be`, joka tarkistaa, että laskurin arvo vastaa argumentin arvoa.

Avainsanoja hyödyntävät niin kutsutut _testitapaukset_ (test cases), jotka ovat itse testejä. Testitapauksilla on nimi (kuten avainsanoilla) ja ne suorittavat avainsanoja tietyssä järjestyksessä. Esimerkiksi testitapaus laskurin kasvattamiselle voisi olla seuraava:

```robot
*** Test Cases ***
Increase Counter Once
    Counter Value Should Be  0
    Increase Counter
    Counter Value Should Be  1
```

Testitapaus koostuu nyt kolmesta avainsanasta. Ensin tarkistetaan että laskurin arvo on aluksi nolla, tämän jälkeen kasvatetaan laskuria ja lopuksi vielä varmistetaan että laskurin arvo on yksi.

Testitapaukset listataan `*** Test Cases ***`-osion alle. Avainsanojen ja testitapausten nimet kirjoitetaan yleensä suurilla alkukirjaimilla niin, että sanojen välissä on yksi välilyönti. **Argumenttien väliin tulee jättää vähintään kaksi välilyöntiä** (esimerkiksi <code>Counter Value Should Be &nbsp;0</code>). Jotta syntaksivirheet huomaisi helposti, kannattaa Visual Studio Codeen asentaa sopiva lisäosa, esim. [Robot Framework Language Server](https://marketplace.visualstudio.com/items?itemName=robocorp.robotframework-lsp) tai [RobotCode](https://marketplace.visualstudio.com/items?itemName=d-biehl.robotcode):

![]({{ "/images/lh3-robot2.png" | absolute_url }})

### Testien suorituskelpoiseksi tekeminen

Avainsanojen, kuten `Increase Counter` taustalla on avainsanan tekninen toteutus. Nämä toteutukset tuottavat niin kutsutut _kirjastot_ (libraries). _hello-robot_-projektin _src_-hakemistosta löytyy tiedosto _CounterLibrary.py_. Tiedosto määrittelee luokan `CounterLibrary`:

```python
from counter import Counter

class CounterLibrary:
    def __init__(self):
        self._counter = Counter()

    def increase_counter(self):
        self._counter.increase()

    def increment_counter_by(self, amount):
        int_amount = int(amount)
        self._counter.increment(int_amount)

    def counter_value_should_be(self, expected):
        int_expected = int(expected)
        if self._counter.value != int_expected:
            raise AssertionError(f"{self._counter.value} != {int_expected}")
```

Kyseisen luokan metodit ovat avainsanojen toteutuksia. Esimerkiksi metodi `increase_counter` toteuttaa avainsanan `Increase Counter` (huomaa, ettei avainsanan väliin tule alaviivaa, vaan se korvaantuu välilyönnillä). Luokan konstruktorissa alustetaan uusi `Counter`-luokan olio, jonka metodeja luokan metodit kutsuvat.

Robot Framework alustaa kirjastot ennen jokaista testitapausta, joten jokaisella testitapauksella on käytössään kirjastosta oma instanssi. Tämä mahdollistaa mm. sen, että jokaista projektin testitapausta varten alustetaan `CounterLibrary`-luokan konstruktorin kautta uusi `Counter`-olio.

Metodi `increment_counter_by` toteuttaa avainsana `Increment Counter By`, jolla on yksi argumentti, `amount`. **Argumenttien arvot ovat aina merkkijonoja**, joten ne täytyy tarvittaessa muuttaa oikean tyyppisiksi, kuten metodi tekee `int`-funktion avulla:

```python
def increment_counter_by(self, amount):
    int_amount = int(amount)
    self._counter.increment(int_amount)
```

Huomaa, että kaikki metodit, joiden nimessä ei ole <i>\_</i>-etuliitettä muodostavat avainsanan toteutuksen. Jos haluat tehdä kirjastoon metodin, josta et halua avainsanaa, nimeä se <i>\_</i>-etuliitteellä:

```python
from counter import Counter

class CounterLibrary:
    def __init__(self):
        self._counter = Counter()

    def _some_helper_method(self):
        pass

    # ...
```

Jotta kirjaston tarjoamia avainsanoja voi käyttää testitiedostossa, se täytyy erikseen tuoda käyttöön. Tämä onnistuu `Settings`-osiossa:

```robot
*** Settings ***
Library  ../CounterLibrary.py

*** Test Cases ***
Increase Counter Once
    Counter Value Should Be  0
    Increase Counter
    Counter Value Should Be  1
```

Huomaa, että kirjaston polku on suhteellinen tiedostoon nähden.

Tiedostoon voi tuoda myös useamman kirjaston lisäämällä monta `Library`-riviä:

```robot
*** Settings ***
Library  ../CounterLibrary.py
Library  ../SomeUsefulLibrary.py
```

### Avainsanojen yhdistely

Kirjastojen lisäksi avainsanoja voi määritellä myös _.robot_-tiedostoissa. Tämä onnistuu määrittelemällä uusi avainsana `*** Keywords ***`-osion alle. Voimme esimerkiksi hyödyntää avainsanaa `Increase Counter` ja toteuttaa avainsanan `Increase Counter Three Times`, joka kasvattaa laskurin arvoa kolmesti:

```robot
*** Settings ***
Library  ../CounterLibrary.py

*** Keywords ***
Increase Counter Three Times
    Increase Counter
    Increase Counter
    Increase Counter
```

### Nollaamisen skenaariot

Lisää _src/tests_-hakemistoon tiedosto <i>reset_counter.robot</i>, joka sisältää laskimen nollaamiseen liittyvät hyväksymistestit.

**Lisää tiedostoon seuraavat testitapaukset:**

```robot
*** Settings ***
Library  ../CounterLibrary.py

*** Test Cases ***
Reset Counter After One Increment
    Counter Value Should Be  0
    Increase Counter
    Counter Value Should Be  1
    Reset Counter
    Counter Value Should Be  0

Reset Counter After Several Increments
    Counter Value Should Be  0
    Increment Counter By  5
    Counter Value Should Be  5
    Reset Counter
    Counter Value Should Be  0
```

Siirry virtuaaliympäristöön komennolla `poetry shell` ja suorita siellä komento `robot src/tests`. Testit eivät mene läpi ja tulosteessa on seuraava virhe:

```
No keyword with name 'Reset Counter' found.
```

Robot Framework siis ilmoittaa, ettei avainsanalle `Reset Counter` ole toteutusta.

**Toteuta seuraavaksi `CounterLibrary`-luokkaan sopiva metodi, jotta testit menevät läpi.**

## Typoja materiaalissa

{% include typo_instructions.md path="/python/robot_framework.md" %}
