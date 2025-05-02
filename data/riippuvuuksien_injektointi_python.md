---
layout: page
title: Riippuvuuksien injektointi
inheader: no
permalink: /riippuvuuksien_injektointi_python/
---

## Riippuvuuksien injektointi

Lue ensin <http://jamesshore.com/Blog/Dependency-Injection-Demystified.html>

Alla oleva koodi löytyy poetry-muotoisena projektina kurssin [tehtävärepositoriosta]({{site.python_exercise_repo_url}}) hakemistosta koodi/viikko1/riippuvuuksien-injektointi-1

Seuraavassa yksinkertainen laskin:

```py
class Laskin:
    def suorita(self):
        while True:
            luku1 = int(input("Luku 1:"))

            if luku1 == -9999:
                return

            luku2 = int(input("Luku 2:"))

            if luku2 == -9999:
                return

            vastaus = self._laske_summa(luku1, luku2)

            print(f"Summa: {vastaus}")

    def _laske_summa(self, luku1, luku2):
        return luku1 + luku2

def main():
    laskin = Laskin()

    laskin.suorita()

if __name__ == "__main__":
    main()
```

Ohjelman ikävä puoli on se, että <code>Laskin</code>-luokalla on _konkreettinen riippuvuus_ tulostuksen ja syötteen luvun hoitaviin funktioihin <code>print</code> <code>input</code>.

Konkreettiset riippuvuudet vaikeuttavat testaamista ja tekevät ohjelman laajentamisen vaikeaksi.

### Riippuvuuden eliminointi

Eristetään tulostuksen ja syötteen lukeminen omaan, luokan `KonsoliIO` olioon:

```python
class KonsoliIO:
    def lue(self, teksti):
        return input(teksti)

    def kirjoita(self, teksti):
        print(teksti)
```

Muokataan luokkaa <code>Laskin</code> siten, että se saa konstruktorin parametrina olion, jonka kautta se hoitaa käyttäjän kanssa tapahtuvan kommunikoinnin:

```python
class Laskin:
    def __init__(self, io):
        self._io = io

    def suorita(self):
        while True:
            luku1 = int(self._io.lue("Luku 1:"))

            if luku1 == -9999:
                return

            luku2 = int(self._io.lue("Luku 2:"))

            if luku2 == -9999:
                return

            vastaus = self._laske_summa(luku1, luku2)

            self._io.kirjoita(f"Summa: {vastaus}")

    def _laske_summa(self, luku1, luku2):
        return luku1 + luku2

```

Sovellus käynnistetään nyt siten, että sille _injektoidaan_ kommunikaation hoitava olio konstruktorin parametrina:

```python
def main():
    io = KonsoliIO()
    laskin = Laskin(io)

    laskin.suorita()

main()
```

### Testaus

Ohjelmalle on nyt helppo tehdä yksikkötestit. Testejä varten toteutetaan valeluokka eli "stubi", joka toimii ulkoisesti samalla tavalla kuin luokan `KonsoliIO` oliot:

```python
class StubIO:
    def __init__(self, inputs):
        self.inputs = inputs
        self.outputs = []

    def lue(self, teksti):
        return self.inputs.pop(0)

    def kirjoita(self, teksti):
        self.outputs.append(teksti)
```

Stubille voidaan siis antaa "käyttäjän syötteet" konstruktorin parametrina. Ohjelman tulosteet saadaan suorituksen jälkeen kysyttyä stubilta.

Testi seuraavassa:

```python
class TestLaskin(unittest.TestCase):
    def test_yksi_summa_oikein(self):
        io = StubIO(["1", "3", "-9999"])
        laskin = Laskin(io)
        laskin.suorita()

        self.assertEqual(io.outputs[0], "Summa: 4")
```

### Yhteenveto

Riippuvuuksien injektointi on siis oikeastaan äärimmäisen simppeli tekniikka, moni on varmaan sitä käyttänytkin jo ohjelmoinnin peruskursseilla.

Jos ajatellaan vaikkapa tietokonepelejä, joiden toiminta riippuu usein satunnaisluvuista. Jos peli on koodattu seuraavasti, on automatisoitu testaus erittäin vaikeaa:

```python
class Peli:
    def liikuva_pelaajaa(self):
      suunta = random.randint(0, 8)
```

Jos taas satunnaislukugeneraattori _injektoidaan_ pelille seuraavasti

```python
class Peli:
    def __init__(self, arpa):
        self._arpa = arpa

  def liikuva_pelaajaa(self):
    suunta = self._arpa.randint(0, 8)
```

voidaan testatessa injektoida pelille versio satunnaisgeneraattorista, jonka arpomia lukuja voidaan kontrolloida testeistä käsin. Esimerkiksi seuraavassa sellainen versio satunnaislukugeneraattorista, joka palauttaa aina luvun 1 kutsuttaessa metodia _randint_:

```python
class Arpa:
    def randint(self, a, b):
        return 1
```
