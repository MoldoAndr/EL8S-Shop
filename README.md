Obiectivul temei este de a crea un website ce contine o aplicatie de chat si o aplicatie de IA. Tema va fi implementată folosind mai multe deployment-uri gestionate de un cluster de Kubernetes. Arhitectura acestei aplicatii va cuprinde mai multe elemente:

   Site-ul web efectiv va fi ținut pe un content management system (CMS).

   Acestei teme ii este asignată Statamic cu 4 replici.
   Site-ul va fi expus pe portul 80.
   Puteti folosi webgui-ul/sau abordarea code-first pentru a construi un mic site pentru un magazin, o pizzerie, o postare de tip articol blog. Alegerea e a voastra (nu pierdeti mult timp dar nici nu läsati pagina goală).
   Sistemul de CMS va folosi o bază de date proprie, pe aceasta o puteti identifica in documentatia specifică. Unele CMS-uri permit mai multe variante de baze de date. Alegerea este la latitudinea voastră.

   Sistemul de chat va fi introdus in pagina web a CMS-ului folosind un iframe html.

   Implementarea backend-ului de chat se va realiza folosind protocolul WebSocket. Codul pentru acesta se va afla pe un server web. Acestei teme ii este asignată folosirea Node.js+Apache cu 4 replici.
   Serverul de chat va fi expus pe portul 88.
   Partea de client va fi implementată folosind un framework de frontend. Acestei teme ii este asignată folosirea Angular cu 1 replică.
   Clientul de chat va fi expus pe portul 90.
   Pentru stocarea mesajelor in baza de date, se vor salva următoarele: numele utilizatorului sursă, mesajul în format text, ASCII; timestamp-ul trimiterii mesajului.
   Pagina de chat va contine un formular în care se introduce un mesaj text, şi va avea un buton de trimitere. Vor fi afisate si mesajele din trecut (aflate in baza de date) in ordine cronologică.
   Chatul va fi introdus în pagina CMS-ului printr-un iframe.

   Aplicatia de IA va fi introdusă în pagina web a CMS-ului folosind un iframe html.

   Această aplicatie va reprezenta o pagină web ce va permite upload-ul unui fişier care va fi procesat apoi de un sistem de IA.
   Partea de client va fi implementată folosind un framework de frontend. Acestei teme ii este asignată folosirea Angular cu 1 replică.
   Se va menține un istoric cu toate cererile realizate si rezultatele obtinute.
   Fisierele vor fi stocate folosind blob storage-ul Azure.
   Informatiile despre fişiere (nume, adresa blob, timestamp, rezultat procesare) vor fi stocate intr-o bază de date SQL hostată în Azure.
   Fisierele vor fi procesate folosind un serviciu de IA. Acestei teme îi este asignat serviciul speech translation.
   Aplicatia de IA va fi introdusă în pagina CMS-ului printr-un iframe.

   Pentru majoritatea componentelor este recomandat să folosiți containere de pe Dockerhub. În general le puteți folosi cu doar mici modificări. Este posibil să fie nevoie să vă creați propriile imagini. Se vor avea în vedere Dockerfile-urile de tip multi-stage pentru reducerea dimensiunilor.

   Pentru containerul care tine serverul web ce expune chat-ul va trebui să implementați voi codul şi să creați o imagine custom. Atenție, orice imagine custom va fi stocată de un registry privat al clusterului.

   Tema va consta într-o serie de fişiere de tip .yaml (şi alte fişiere de configurare inițiale). Întreaga arhitectură va trebui pornită dintr-o singură comandă apply. Odată executată comanda apply totul va trebui să funcționeze. Când prezentați nu va fi permis să faceți nicio modificare după ce dați apply, nici măcar la CMS.

   Pentru fiecare componentă se va crea un folder în care se va afla fişierul Dockerfile alături de oricare alte fişiere (cod, export bază de date, ş.a.m.d.).

   În ziua prezentării, maşinile Kubernetes (două) trebuie să fie pregătite și pornite. La fel si addon-urile (de ex. registry). Containerele ce necesită acest lucru trebuie să fie deja build-uite și puse în registry.