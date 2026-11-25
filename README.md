# Hub de proiecte · design Graphite

Site personal care funcționează ca hub pentru proiecte (software, automation & IoT, embedded, AI & data).
Construit după conceptul **Graphite** aprobat în etapa de design.

## Pornire

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # generează site-ul static în out/
```

Folderul `out/` poate fi publicat pe orice hosting static. Cel mai simplu: importă repo-ul în
[Vercel](https://vercel.com/new) sau Netlify, fără nicio configurare.

## Ce trebuie completat

| Fișier | Ce conține |
|---|---|
| `src/content/profile.ts` | Numele, titlul din hero, textul „Despre”, competențe, email, linkuri |
| `src/content/projects.ts` | Lista proiectelor. Cele cu `example: true` sunt locțiitoare |
| `public/projects/<slug>/` | Imaginile și videoclipurile fiecărui proiect |

## Cum adaugi un proiect

1. Adaugă un obiect nou în `src/content/projects.ts` (copiază unul existent).
2. Alege `category` dintre `software`, `automation-iot`, `embedded`, `ai-data`.
3. Opțional: `featured: true` pentru card mare pe pagina principală, `model: "house" | "board"` pentru obiect 3D,
   `gallery` pentru imagini/video, `links` pentru GitHub, demo sau website-ul dedicat.

Pagina principală, filtrele, numărul de proiecte pe categorii și pagina `/projects/<slug>/` se actualizează singure.
Pentru Home Automation, când există website-ul dedicat, pune adresa în `links.site`.

## Tehnologii și de ce

- **Next.js (export static)**: pagini generate la build, deci rapide și ieftin de găzduit; rutare pentru paginile de proiect.
- **Tailwind CSS v4**: tokenii paletei Graphite sunt în `src/app/globals.css` (`@theme`).
- **Three.js + React Three Fiber**: doar pentru scenele 3D ale proiectelor (casa, placa). Se încarcă abia când
  ajung aproape de ecran și nu randează când nu sunt vizibile. Fără WebGL rămâne o ilustrație SVG.
- **Poliedrul din hero** e desenat pe un canvas 2D simplu, fără Three.js, ca primul ecran să se încarce instant.
- **Animațiile** sunt CSS (fără GSAP/Motion): intrarea titlului, apariția la scroll, tranziția între pagini.
  Toate se opresc la `prefers-reduced-motion`.

## Structură

```
src/
  app/                 pagini (/, /projects/[slug], 404) și stiluri globale
  components/          secțiuni și componente
    scenes/            scenele 3D (HouseScene, BoardScene) și datele lor
  content/             profil, categorii, proiecte (aici se editează conținutul)
```
