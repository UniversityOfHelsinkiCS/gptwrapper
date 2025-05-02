---
layout: page
permalink: /pylint
title: Pylint ja koodin staattinen analyysi
---

_Tämä ohje on kopio kurssin Ohjelmistotekniikka [Pylint-ohjeesta](https://ohjelmistotekniikka-hy.github.io/python/viikko4#pylint-ja-koodin-laaduun-staattinen-analyysi) ohjeesta muutamin lisäyksin_

Koodin testauksen lisäksi koodin laadun ylläpitäminen on tärkeää. Laadun ylläpitäminen on mahdollista erilaisilla manuaalisilla menetelmillä, kuten laatuvaatimusten dokumentoinnilla ja koodikatselmoinneilla. Monet manuaaliset laadunhallinnan menetelmät osoittautuvat kuitenkin laajoissa ohjelmistoprojekteissa usein turhan aikaavieviksi ja virhealttiiksi. _Staattinen analyysi_ on menetelmä, jonka avulla koodia voidaan analysoida automatisoidusti ilman, että sitä tarvitsee suorittaa. Staattista analyysia hyödynnetään ohjelmistokehityksessä laajasti mm. ohjelmointivirheiden huomaamiseen ja laatutarkistuksien tekemiseen.

Eräs Python-koodin staattisessa analyysissä laajasti käytetty työkalu on [Pylint](https://www.pylint.org/). Pylintin avulla voimme määrittä koodin laadulle erilaisia vaatimuksia ja automatisoidusti tarkastaa, noudattaako tarkastettava koodi näitä sääntöjä.

> Pylint is a tool that checks for errors in Python code, tries to enforce a coding standard and looks for code smells. It can also look for certain type errors, it can recommend suggestions about how particular blocks can be refactored and can offer you details about the code's complexity.

### Pylintin käyttöönotto projektissa

Pylint on helppo ottaa käyttöön Poetry-projektissa. Aloitetaan asentamalla Pylint projektimme kehityksen aikaiseksi riippuvuudeksi:

```
poetry add pylint --group dev
```

Pylintille tulee määritellä joukko tarkistettavia [sääntöjä](https://pylint.readthedocs.io/en/stable/user_guide/configuration/all-options.html#standard-checkers). Säännöt määritellään projektin juurihakemiston _.pylintrc_-tiedostossa. Luo kyseinen tiedosto ja kopioi sinne [tämän]({{site.python_exercise_repo_url}}/blob/main/viikko2/varasto/.pylintrc) tiedoston sisältö. Tiedosto sisältää hieman muunnellun version Pylintin suosittelemasta konfiguraatiosta, jota voi katsella komennolla `pylint --generate-rcfile`.

Pylintin laatutarkistukset voi suorittaa komentoriviltä siirtymällä ensin virtuaaliympäristöön komennolla `poetry shell` ja sen jälkeen suorittamalla komennon `pylint src`. Komento tulee suorittaa projektin juurihakemistossa, eli samassa hakemistossa missä _pyproject.toml_-tiedosto sijaitsee. Kyseinen komento suorittaa laatutarkistukset _src_ hakemistossa. Pylint antaa koodille "arvosanan" sen laadun mukaan, joka löytyy tulosteen lopusta:

```
Your code has been rated at 10.00/10 (previous run: 10.00/10, +0.00)
```

### Laatutarkistuksien kytkeminen pois päältä

Lähtökohtaisesti Pylintin huomauttamat laatuvirheet kannattaa yrittää kaikin keinoin korjata. Tämä johtaa lähes aina laadukkaampaan koodin. Joissain tilanteissa voimme kuitenkin hyväksyä laatuvirheet ja kytkeä tarkastukset pois päältä. Tähän löytyy erilaisia keinoja.

Otetaan esimerkiksi seuraava _src/index.py_-tiedosto:

```python
x = 3
print(x)
```

Komennon `pylint src` suorittaminen paljastaa, että Pylint löytää tiedostosta seuraavan virheen:

```
src/index.py:1:0: C0103: Constant name "x" doesn't conform to UPPER_CASE naming style (invalid-name)
```

Eli tiedoston _src/index.py_-riviltä yksi löytyy väärin nimetty muuttuja. Rikottavan säännön nimi on tässä tilanteessa `invalid-name`. Järkevintä olisi vain antaa muuttujalle nimeksi `X`, mutta havainnollistetaan, kuinka säännön tarkistuksen voi ottaa riviltä pois päältä. Lisätään riville seuraava kommentti:

```python
x = 3 # pylint: disable=invalid-name
print(x)
```

Nyt `pylint src`-komennon suorittaminen pitäisi kertoa, ettei virheitä enää löydy.

Voimme myös jättää tarkistuksien ulkopuolelle kokonaisia hakemistoja ja tiedostoja. Muokkaamalla [tätä]({{site.python_exercise_repo_url}}/blob/main/viikko2/varasto/.pylintrc#L13) riviä _.pylintrc_ tiedossa. Voimme esimerkiksi jättää käyttöliittymästä vastaavan koodin hakemistossa _src/ui_ ja testit hakemistossa _src/tests_ tarkistuksien ulkopuolle:

```
ignore=CVS,ui,tests
```

### Integrointi editoriin

Monissa editoreissa on lisäosia, jotka huomauttavat laatuvirheistä suoraan koodissa. Tämä tekee niiden huomaamisesta ja korjaamisesta nopeampaa. Jos käytössäsi on [Visual Studio Code](https://code.visualstudio.com/), riittää että asennat [Pylint](https://marketplace.visualstudio.com/items?itemName=ms-python.pylint)-lisäosan:

![Visual Studio Code Pylint lisäosa]({{ "/images/vscode-pylint.png" | absolute_url }})

Tämän jälkeen Visual Studio Coden (joka pitää ehkä käynnistää uudelleen lisäosan asennuksen jälkeen) tulisi huomauttaa laatuvirheistä suoraan koodissa sinisellä alleviivauksessa. Viemällä hiiren ongelmallisen koodin päälle pitäisi aueta tarkempaa tietoa virheestä:

![Visual Studio Code Pylint virhe]({{ "/images/vscode-pylint-virhe.png" | absolute_url }})

Jos integroinnin kanssa ilmenee ongelmia, tutustu Visual Studio Coden [ohjeisiin](https://code.visualstudio.com/docs/python/linting).

### Bonus: automaattinen formatointi

Tiettyjen laatukorjausten, kuten sisennysten ja liian pitkien koodirivien korjaaminen tuottaa välillä turhaa manuaalista työtä. Koodin automaattisessa formatoinnissa auttaa [autopep8](https://pypi.org/project/autopep8/)-kirjasto. Kirjasto formatoi koodin automaattisesti [PEP 8](https://www.python.org/dev/peps/pep-0008/)-tyyliohjeiden mukaisesti. Aloitetaan sen käyttö asentamalle se projektin riippuvuudeksi:

```bash
poetry add autopep8 --group dev
```

Tämän jälkeen voimme virtuaaliympäristössä formatoida _src_ hakemiston koodin komennolla:

```bash
autopep8 --in-place --recursive src
```

Koodin formatointi onnistuu myös monissa editoreissa kätevästi yhdellä näppäinkomennolla. Ohje koodin formatointiin Visual Studio Codessa löytyy [täältä](https://code.visualstudio.com/docs/editor/codebasics#_formatting).
