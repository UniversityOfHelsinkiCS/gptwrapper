---
layout: page
title: Riippuvuuksien injektointi
inheader: no
permalink: /riippuvuuksien_injektointi/
---

Lue ensin <http://jamesshore.com/Blog/Dependency-Injection-Demystified.html>

Alla oleva koodi löytyy gradle-muotoisina projekteina kurssin [tehtävärepositoriosta]({{site.java_exercise_repo_url}}) hakemistosta koodi/viikko1/RiippuvuuksienInjektointi1

Seuraavassa yksinkertainen laskin:

```java
public class Main {
    public static void main(String[] args) {
        Laskin laskin = new Laskin();
        laskin.suorita();
    }
}

public class Laskin {

    private Scanner lukija;

    public Laskin() {
        lukija = new Scanner(System.in);
    }

    public void suorita() {
        while( true ) {
            System.out.println("luku 1: ");
            int luku1 = lukija.nextInt();
            if ( luku1==-9999  ) return;

            System.out.println("luku 2: ");
            int luku2 = lukija.nextInt();
            if ( luku2==-9999  ) return;

            int vastaus = laskeSumma(luku1, luku2);
            System.out.println("summa: "+ vastaus);
        }
    }

    private int laskeSumma(int luku1, int luku2) {
        return luku1+luku2;
    }

}
```

Ohjelman ikävä puoli on se, että <code>Laskin</code>-luokalla on _konkreettinen riippuvuus_ <code>Scanner</code>-olioon ja ruudulle tulostamisen hoitavaan <code>System.out</code>-olioon.

Konkreettiset riippuvuudet vaikeuttavat testaamista ja tekevät ohjelman laajentamisen vaikeaksi.

### Riippuvuus rajapintaan

Määritellään rajapinta, jonka taakse konkreettiset riippuvuudet voidaan piilottaa:

```java
public interface IO {
    int nextInt();
    void print(String m);
}
```

Tehdään rajapinnalle toteutus:

```java
public class KonsoliIO implements IO {
    private Scanner lukija;

    public KonsoliIO() {
        lukija = new Scanner(System.in);
    }

    public int nextInt() {
        return lukija.nextInt();
    }

    public void print(String m) {
        System.out.println(m);
    }

}
```

Muokatussa <code>Laskin</code>-luokan versiossa määritellään <code>IO</code>-rajapinnan toteuttava oliomuuttuja, joka annetaan laskin-oliolle konstruktorin parametrina:

```java
public class Laskin {
    private IO io;

    public Laskin(IO io) {
        this.io = io;
    }

    public void suorita(){
        while( true ) {
            io.print("luku 1: ");
            int luku1 = io.nextInt();
            if ( luku1==-9999  ) return;

            io.print("luku 2: ");
            int luku2 = io.nextInt();
            if ( luku2==-9999 ) return;

            int vastaus = laskeSumma(luku1, luku2);
            io.print("summa: "+vastaus+"\n");
        }
    }

    private int laskeSumma(int luku1, int luku2) {
        return luku1+luku2;
    }

}
```

Ja laskimelle voidaan antaa IO-luokasta sopiva toteutus _injektoimalla_ eli antamalla se konstruktorin parametrina:

```java
public class Main {
    public static void main(String[] args) {
        Laskin laskin = new Laskin( new KonsoliIO() );
        laskin.suorita();
    }
}
```

### Testaus

Ohjelmalle on nyt helppo tehdä yksikkötestit. Testejä varten toteutetaan IO-rajapinnan toteuttava "stubi":

```java
class IOStub implements IO {

    int[] inputs;
    int mones;
    ArrayList<String> outputs;

    public IOStub(int... inputs) {
        this.inputs = inputs;
        this.outputs = new ArrayList<String>();
    }

    public int nextInt() {
        return inputs[mones++];
    }

    public void print(String m) {
        outputs.add(m);
    }
}
```

Stubille voidaan siis antaa "käyttäjän syötteet" konstruktorin parametrina. Ohjelman tulosteet saadaan suorituksen jälkeen kysyttyä stubilta.

Testi seuraavassa:

```java
public class LaskinTest {

    @Test
    public void yksiSummaOikein() {
        IOStub io = new IOStub(1, 3, -9999);
        new Laskin(io).suorita();

        assertEquals("summa: 4\n", io.outputs.get(2));
    }
}
```

### Yhteenveto

Riippuvuuksien injektointi on siis oikeastaan äärimmäisen simppeli tekniikka, moni on varmaan sitä käyttänytkin jo ohjelmoinnin peruskursseilla.

Jos ajatellaan vaikkapa tietokonepelejä, joiden toiminta riippuu usein satunnaisluvuista. Jos peli on koodattu seuraavasti, on automatisoitu testaus erittäin vaikeaa:

```java
public class Peli {
  private Random arpa;

  public Peli() {
    arpa = new Random();
  }

  // ...
}
```

Jos taas satunnaislukugeneraattori _injektoidaan_ pelille seuraavasti

```java
public class Peli {
  private Random arpa;

  public Peli(Random arpa) {
    this.arpa = arpa;
  }

  // ...
}
```

voidaan testatessa injektoida pelille versio satunnaisgeneraattorista, jonka arpomia lukuja voidaan kontrolloida testeistä käsin. Esimerkiksi seuraavassa sellainen versio satunnaislukugeneraattorista, joka palauttaa aina luvun 1 kutsuttaessa metodia _nextInt_:

```java
public class FakeRandom extends Random {
    @Override
    public int nextInt() {
        return 1;
    }
}
```
