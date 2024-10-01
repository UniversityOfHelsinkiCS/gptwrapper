import json


def avaaKieli(nimi):
    with open(nimi) as tiedosto:
        suomi = tiedosto.read()
    return json.loads(suomi)
    #print(suomenkieli)



def tarkistus(lahdekieli, kohdekieli, kohdekieli2):
    for ryhma in lahdekieli:
        print()
        print(ryhma)
        if not ryhma in kohdekieli or not ryhma in kohdekieli2:
            print("virhe! ryhmaa ei löytynyt " + ryhma)
            exit()
        for sana in lahdekieli[ryhma]:
            if not sana in kohdekieli[ryhma]:
                print("Virhe! sanaa ei löytynyt " + ryhma + ":" +sana + "    kohdekieli")
            if not sana in kohdekieli2[ryhma]:
                print("Virhe! sanaa ei löytynyt " + ryhma + ":" +sana + "    kohdekieli2")
                exit()
            print("  " + sana)
            print(f"    {lahdekieli[ryhma][sana]:40} {kohdekieli[ryhma][sana]:40} {kohdekieli2[ryhma][sana]:<20}")


suomenkieli = avaaKieli("fi.json")
ruotsinkieli = avaaKieli("sv.json")
englanninkieli = avaaKieli("en.json")
tarkistus(suomenkieli, englanninkieli, ruotsinkieli)
#tarkistus(ruotsinkieli, suomenkieli)