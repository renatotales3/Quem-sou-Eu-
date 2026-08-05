/**
 * Catálogo de imagens curadas por personagem.
 *
 * Procedência: Wikidata P18 (imagem oficial) -> arquivo no Wikimedia
 * Commons, resolvido em lote por scripts/resolve-character-images.mjs (T1),
 * filtrado por triagem automática de nome de arquivo e categoria (T2) e
 * revisado visualmente por humano, um a um, com o critério "um brasileiro
 * reconhece o personagem nesta imagem" (T3). Curadoria concluída em
 * 2026-08-05.
 *
 * Dado estático versionado, não gerado pelo build: só entram aqui
 * personagens aprovados na revisão visual. Ausência de uma chave é o caso
 * comum (a maioria do catálogo não tem imagem livre e reconhecível) e o
 * fallback visual de inicial e cor cobre isso — ver design.md.
 *
 * Cada `url` é um thumbnail do Wikimedia Commons com largura até 400px
 * (IMG-06), livre de parâmetros de rastreamento. A maioria segue o padrão
 * .../thumb/.../NNNpx-arquivo (a API do Commons devolveu 330px para todo
 * pedido de thumbnail, nunca o valor exato pedido — ver spec.md). Quatro
 * entradas não têm "/thumb/" no caminho (Pac-Man, Luke Skywalker, C-3PO,
 * Rihanna): são o próprio arquivo original, porque a API do Commons devolve
 * a URL do original como thumbnail quando o original já é menor que a
 * largura pedida (141px–262px de largura, medido via imageinfo em
 * 2026-08-05) — ainda satisfaz "thumbnail pequeno, nunca o original
 * grande", só que sem o segmento /thumb/ no caminho.
 *
 * Chave: nome do personagem normalizado (normalizeText), igual a
 * `aliasesByName` e `englishOriginals` neste mesmo módulo de catálogo.
 */

export interface CharacterImage {
  url: string;
  author: string;
  license: string;
}

export const characterImages: Record<string, CharacterImage> = {
  // Marvel
  'homem de ferro': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Iron_Man_transparent_background.png/330px-Iron_Man_transparent_background.png',
    author: 'David Blaikie from Hampshire, UK',
    license: 'CC BY 2.0',
  }, // Homem de Ferro — Iron Man transparent background.png
  deadpool: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Deadpool%2C_Georgia_Viaduct%2C_Vancouver%2C_April_6_2015_-_3.jpg/330px-Deadpool%2C_Georgia_Viaduct%2C_Vancouver%2C_April_6_2015_-_3.jpg',
    author: 'https://www.flickr.com/people/49347467@N05/',
    license: 'CC BY-SA 2.0',
  }, // Deadpool — Deadpool, Georgia Viaduct, Vancouver, April 6 2015 - 3.jpg
  // DC
  'mulher maravilha': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Lynda_Carter_Wonder_Woman.JPG/330px-Lynda_Carter_Wonder_Woman.JPG',
    author: 'ABC Television',
    license: 'Public domain',
  }, // Mulher-Maravilha — Lynda Carter Wonder Woman.JPG
  'mulher gato': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Eartha_Kitt_Catwoman_debut_1967.jpg/330px-Eartha_Kitt_Catwoman_debut_1967.jpg',
    author: 'American Broadcasting Company',
    license: 'Public domain',
  }, // Mulher-Gato — Eartha Kitt Catwoman debut 1967.jpg
  // Disney e Pixar
  'mickey mouse': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Mickey_Mouse.svg/330px-Mickey_Mouse.svg.png',
    author: 'Walt Disney and Ub Iwerks Vectorization: Mrmw',
    license: 'Public domain',
  }, // Mickey Mouse — Mickey Mouse.svg
  cinderela: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Cinderella_by_Elena_Ringo.jpg/330px-Cinderella_by_Elena_Ringo.jpg',
    author: 'Elena Ringo',
    license: 'CC BY 3.0',
  }, // Cinderela — Cinderella by Elena Ringo.jpg
  malevola: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Maleficent_-_Sleeping_Beauty_1970_Reissue_Trailer.png/330px-Maleficent_-_Sleeping_Beauty_1970_Reissue_Trailer.png',
    author: 'Walt Disney Productions',
    license: 'Public domain',
  }, // Malévola — Maleficent - Sleeping Beauty 1970 Reissue Trailer.png
  // Videogames
  'master chief': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Halo_4_-_Master_Chief.jpg/330px-Halo_4_-_Master_Chief.jpg',
    author: 'Xbox MENA',
    license: 'CC BY 3.0',
  }, // Master Chief — Halo 4 - Master Chief.jpg
  'pac man': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Pac-Man_gameplay_%281x_pixel-perfect_recreation%29.png',
    author: 'Bandai Namco Entertainment America',
    license: 'CC BY 3.0',
  }, // Pac-Man — Pac-Man gameplay (1x pixel-perfect recreation).png
  'steve minecraft': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Steve%3F_2.png/330px-Steve%3F_2.png',
    author: 'Xbox México',
    license: 'CC BY 3.0',
  }, // Steve (Minecraft) — Steve? 2.png
  // Fantasia e ficção científica
  gandalf: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/GANDALF.jpg/330px-GANDALF.jpg',
    author: 'Nidoart',
    license: 'CC BY-SA 3.0',
  }, // Gandalf — GANDALF.jpg
  gollum: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Gollum_s_journey_commences_by_Frederic_Bennett_%28detail%29.jpg/330px-Gollum_s_journey_commences_by_Frederic_Bennett_%28detail%29.jpg',
    author: 'Frédéric Bennett (Benef)',
    license: 'CC BY-SA 4.0',
  }, // Gollum — Gollum s journey commences by Frederic Bennett (detail).jpg
  'ron weasley': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Ron_Weasley.jpg/330px-Ron_Weasley.jpg',
    author: 'Mademoiselle Ortie / Elodie Tihange',
    license: 'CC BY-SA 4.0',
  }, // Ron Weasley — Ron Weasley.jpg
  'draco malfoy': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Draco_Malfoy_fanart_-_Cor-Sa.jpg/330px-Draco_Malfoy_fanart_-_Cor-Sa.jpg',
    author: 'Cor-Sa on DeviantArt',
    license: 'CC BY-SA 3.0',
  }, // Draco Malfoy — Draco Malfoy fanart - Cor-Sa.jpg
  'luke skywalker': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Luke_Skywalker_-_Welcome_Banner_%28Cropped%29.jpg',
    author: 'Official Star Wars Flickr',
    license: 'CC BY 2.0',
  }, // Luke Skywalker — Luke Skywalker - Welcome Banner (Cropped).jpg
  'han solo': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Han_Solo_in_Carbonite_%2831649435213%29.jpg/330px-Han_Solo_in_Carbonite_%2831649435213%29.jpg',
    author: 'William Warby from London, England',
    license: 'CC BY 2.0',
  }, // Han Solo — Han Solo in Carbonite (31649435213).jpg
  chewbacca: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Solo-_A_Star_Wars_Story_Japan_Premiere_Red_Carpet-_Chewbacca.jpg/330px-Solo-_A_Star_Wars_Story_Japan_Premiere_Red_Carpet-_Chewbacca.jpg',
    author: 'Dick Thomas Johnson from Tokyo, Japan',
    license: 'CC BY 2.0',
  }, // Chewbacca — Solo- A Star Wars Story Japan Premiere Red Carpet- Chewbacca.jpg
  'c 3po': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Star_Wars_-_A_New_Hope%2C_filming_in_Death_Valley_%28cropped%29.jpg',
    author: 'Unknown authorUnknown author',
    license: 'Public domain',
  }, // C-3PO — Star Wars - A New Hope, filming in Death Valley (cropped).jpg
  godzilla: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Godzilla_%281954%29_%28cropped%29.jpg/330px-Godzilla_%281954%29_%28cropped%29.jpg',
    author: 'Toho Company Ltd.',
    license: 'Public domain',
  }, // Godzilla — Godzilla (1954) (cropped).jpg
  // Cinema
  'indiana jones': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Indianajones4.jpg/330px-Indianajones4.jpg',
    author: 'John Griffiths',
    license: 'CC BY-SA 2.0',
  }, // Indiana Jones — Indianajones4.jpg
  'rocky balboa': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Sylvester_Stallone_Rocky_VI_2005.jpg/330px-Sylvester_Stallone_Rocky_VI_2005.jpg',
    author: 'Lance Cpl. Ray Lewis',
    license: 'Public domain',
  }, // Rocky Balboa — Sylvester Stallone Rocky VI 2005.jpg
  // Séries
  'walter white': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Bryan_Cranston_%287598828512%29.jpg/330px-Bryan_Cranston_%287598828512%29.jpg',
    author: 'Gage Skidmore from Peoria, AZ, United States of America',
    license: 'CC BY-SA 2.0',
  }, // Walter White — Bryan Cranston (7598828512).jpg
  'jesse pinkman': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Aaron_Paul_%287598828942%29.jpg/330px-Aaron_Paul_%287598828942%29.jpg',
    author: 'Gage Skidmore from Peoria, AZ, United States of America',
    license: 'CC BY-SA 2.0',
  }, // Jesse Pinkman — Aaron Paul (7598828942).jpg
  'sherlock holmes': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Adventures_with_Sherlock_Holmes_TD_Gallery_Jan_5-Mar_10%2C_2012.jpg/330px-Adventures_with_Sherlock_Holmes_TD_Gallery_Jan_5-Mar_10%2C_2012.jpg',
    author: 'Special Collections Toronto Public Library from Toronto, Canada',
    license: 'Public domain',
  }, // Sherlock Holmes — Adventures with Sherlock Holmes TD Gallery Jan 5-Mar 10, 2012.jpg
  'dwight schrute': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/RainnwilsonOct07.jpg/330px-RainnwilsonOct07.jpg',
    author: 'StacyD at https://www.flickr.com/people/ctrlaltstacy/',
    license: 'CC BY 3.0',
  }, // Dwight Schrute — RainnwilsonOct07.jpg
  'o doutor': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Sylvester_McCoy_Doctor.jpg/330px-Sylvester_McCoy_Doctor.jpg',
    author: 'Jack1956',
    license: 'CC0',
  }, // O Doutor — Sylvester McCoy Doctor.jpg
  // Ficção brasileira
  emilia: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Reny_como_Em%C3%ADlia_no_%22S%C3%ADtio_do_Picapau_Amarelo%22_%281978%29.jpg/330px-Reny_como_Em%C3%ADlia_no_%22S%C3%ADtio_do_Picapau_Amarelo%22_%281978%29.jpg',
    author: 'Eric Iozzi',
    license: 'CC BY-SA 4.0',
  }, // Emília — Reny como Emília no "Sítio do Picapau Amarelo" (1978).jpg
  // Música
  'michael jackson': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Michael_Jackson_1983_%283x4_cropped%29_%28contrast%29.jpg/330px-Michael_Jackson_1983_%283x4_cropped%29_%28contrast%29.jpg',
    author: 'Matthew Rolston; Distributed by Epic Records',
    license: 'Public domain',
  }, // Michael Jackson — Michael Jackson 1983 (3x4 cropped) (contrast).jpg
  'elvis presley': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Elvis_Presley_1973_RCA_Records_and_Tapes_publicity_2_-_cropped.png/330px-Elvis_Presley_1973_RCA_Records_and_Tapes_publicity_2_-_cropped.png',
    author: 'RCA Records',
    license: 'Public domain',
  }, // Elvis Presley — Elvis Presley 1973 RCA Records and Tapes publicity 2 - cropped.png
  madonna: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/MadonnaO2171023_%2897_of_133%29_%2853269593787%29_%28cropped%29.jpg/330px-MadonnaO2171023_%2897_of_133%29_%2853269593787%29_%28cropped%29.jpg',
    author: 'Raph_PH',
    license: 'CC BY 2.0',
  }, // Madonna — MadonnaO2171023 (97 of 133) (53269593787) (cropped).jpg
  beyonce: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Beyonc%C3%A9_-_Tottenham_Hotspur_Stadium_-_1st_June_2023_%2810_of_118%29_%2852946364598%29_%28best_crop%29.jpg/330px-Beyonc%C3%A9_-_Tottenham_Hotspur_Stadium_-_1st_June_2023_%2810_of_118%29_%2852946364598%29_%28best_crop%29.jpg',
    author: 'Raph_PH',
    license: 'CC BY 2.0',
  }, // Beyoncé — Beyoncé - Tottenham Hotspur Stadium - 1st June 2023 (10 of 118) (52946364598) (best crop).jpg
  rihanna: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/1/16/Rihanna_visits_U.S._Embassy_in_Barbados_2024_%28cropped%29.jpg',
    author: 'U.S. Embassy Bridgetown',
    license: 'Public domain',
  }, // Rihanna — Rihanna visits U.S. Embassy in Barbados 2024 (cropped).jpg
  'lady gaga': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Lady_Gaga_at_Oscars_2016.jpg/330px-Lady_Gaga_at_Oscars_2016.jpg',
    author: 'Office of the Vice President of the United States',
    license: 'Public domain',
  }, // Lady Gaga — Lady Gaga at Oscars 2016.jpg
  'taylor swift': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29.png/330px-Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29.png',
    author: 'iHeartRadioCA',
    license: 'CC BY 3.0',
  }, // Taylor Swift — Taylor Swift at the 2023 MTV Video Music Awards (3).png
  'britney spears': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Britney_Spears-FFT-Toronto_%28cropped%29.jpg/330px-Britney_Spears-FFT-Toronto_%28cropped%29.jpg',
    author: 'Jen from USA.',
    license: 'CC BY 2.0',
  }, // Britney Spears — Britney Spears-FFT-Toronto (cropped).jpg
  'bruno mars': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/BrunoMars24KMagicWorldTourLive_%28cropped%29.jpg/330px-BrunoMars24KMagicWorldTourLive_%28cropped%29.jpg',
    author: 'slgckgc',
    license: 'CC BY 4.0',
  }, // Bruno Mars — BrunoMars24KMagicWorldTourLive (cropped).jpg
  adele: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Adele_2016.jpg/330px-Adele_2016.jpg',
    author: 'Marc E.',
    license: 'CC BY 2.0',
  }, // Adele — Adele 2016.jpg
  'amy winehouse': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Amy_Winehouse_f4962007_crop.jpg/330px-Amy_Winehouse_f4962007_crop.jpg',
    author: 'Rama',
    license: 'CC BY-SA 2.0 fr',
  }, // Amy Winehouse — Amy Winehouse f4962007 crop.jpg
  'bob marley': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Bob_Marley_1976_press_photo.jpg/330px-Bob_Marley_1976_press_photo.jpg',
    author: 'Dennis Morris; Distributed by Island Records',
    license: 'Public domain',
  }, // Bob Marley — Bob Marley 1976 press photo.jpg
  'john lennon': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/John_Lennon_portrait.jpg/330px-John_Lennon_portrait.jpg',
    author: 'Jack Mitchell',
    license: 'CC BY-SA 3.0',
  }, // John Lennon — John Lennon portrait.jpg
  'paul mccartney': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/ACL18051018-122_%2843716152470%29.jpg/330px-ACL18051018-122_%2843716152470%29.jpg',
    author: 'Raph_PH',
    license: 'CC BY 2.0',
  }, // Paul McCartney — ACL18051018-122 (43716152470).jpg
  'freddie mercury': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Freddie_Mercury_performing_in_New_Haven%2C_CT%2C_November_1977.jpg/330px-Freddie_Mercury_performing_in_New_Haven%2C_CT%2C_November_1977.jpg',
    author: 'Carl Lender',
    license: 'CC BY-SA 3.0',
  }, // Freddie Mercury — Freddie Mercury performing in New Haven, CT, November 1977.jpg
  'david bowie': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/David-Bowie_Chicago_2002-08-08_photoby_Adam-Bielawski-cropped.jpg/330px-David-Bowie_Chicago_2002-08-08_photoby_Adam-Bielawski-cropped.jpg',
    author: 'Adam Bielawski',
    license: 'CC BY-SA 3.0',
  }, // David Bowie — David-Bowie Chicago 2002-08-08 photoby Adam-Bielawski-cropped.jpg
  'elton john': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Elton_John_2023.jpg/330px-Elton_John_2023.jpg',
    author: 'Raph_PH',
    license: 'CC BY 2.0',
  }, // Elton John — Elton John 2023.jpg
  'whitney houston': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Whitney_Houston_%28cropped3%29.JPEG/330px-Whitney_Houston_%28cropped3%29.JPEG',
    author: 'PH2 Mark Kettenhofen',
    license: 'Public domain',
  }, // Whitney Houston — Whitney Houston (cropped3).JPEG
  anitta: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Anitta_for_Attractive_Mindset_podcast_02.jpg/330px-Anitta_for_Attractive_Mindset_podcast_02.jpg',
    author: 'Attractive Mindset',
    license: 'CC BY 3.0',
  }, // Anitta — Anitta for Attractive Mindset podcast 02.jpg
  'roberto carlos': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Roberto_Carlos_Credicard_Hall_%2844435767951%29.jpg/330px-Roberto_Carlos_Credicard_Hall_%2844435767951%29.jpg',
    author: 'Teca Lamboglia from São Paulo, Brasil',
    license: 'CC BY 2.0',
  }, // Roberto Carlos — Roberto Carlos Credicard Hall (44435767951).jpg
  // Esportes
  pele: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Pele_con_brasil_%28cropped%29.jpg/330px-Pele_con_brasil_%28cropped%29.jpg',
    author: 'Unknown authorUnknown author',
    license: 'Public domain',
  }, // Pelé — Pele con brasil (cropped).jpg
  marta: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/NC_Courage_vs_Orlando_Pride_%28Jun_2024%29_073_%28cropped%29.jpg/330px-NC_Courage_vs_Orlando_Pride_%28Jun_2024%29_073_%28cropped%29.jpg',
    author: 'Hameltion',
    license: 'CC BY-SA 4.0',
  }, // Marta — NC Courage vs Orlando Pride (Jun 2024) 073 (cropped).jpg
  neymar: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Neymar_Junior_Brazil_V_Morocco_13_June_2026-40.jpg/330px-Neymar_Junior_Brazil_V_Morocco_13_June_2026-40.jpg',
    author: 'Bryan Berlin',
    license: 'CC BY-SA 4.0',
  }, // Neymar — Neymar Junior Brazil V Morocco 13 June 2026-40.jpg
  'ronaldo nazario': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/051119SMcC0014.jpg/330px-051119SMcC0014.jpg',
    author: 'Web Summit',
    license: 'CC BY 2.0',
  }, // Ronaldo Nazário — 051119SMcC0014.jpg
  'ronaldinho gaucho': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Ronaldinho_in_2019.jpg/330px-Ronaldinho_in_2019.jpg',
    author: 'Marcos Corrêa/PR',
    license: 'CC BY 2.0',
  }, // Ronaldinho Gaúcho — Ronaldinho in 2019.jpg
  romario: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Senadores_da_57%C2%AA_Legislatura_%2852689451805%29.jpg/330px-Senadores_da_57%C2%AA_Legislatura_%2852689451805%29.jpg',
    author: 'Agência Senado from Brasilia, Brazil',
    license: 'CC BY 2.0',
  }, // Romário — Senadores da 57ª Legislatura (52689451805).jpg
  'ayrton senna': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Ayrton_Senna_9_-_Cropped.jpg/330px-Ayrton_Senna_9_-_Cropped.jpg',
    author: 'Instituto Ayrton Senna',
    license: 'CC BY 2.0',
  }, // Ayrton Senna — Ayrton Senna 9 - Cropped.jpg
  'rebeca andrade': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Rebeca_Andrade_in_2023.jpg/330px-Rebeca_Andrade_in_2023.jpg',
    author: 'Sarah Ladot',
    license: 'CC BY-SA 4.0',
  }, // Rebeca Andrade — Rebeca Andrade in 2023.jpg
  'michael jordan': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Michael_Jordan.jpg/330px-Michael_Jordan.jpg',
    author: 'Joshua Massel. Cropped by en:User:Quadzilla99',
    license: 'CC BY-SA 2.0',
  }, // Michael Jordan — Michael Jordan.jpg
  'lebron james': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/LeBron_James_%2851959977144%29_%28cropped2%29.jpg/330px-LeBron_James_%2851959977144%29_%28cropped2%29.jpg',
    author: 'Erik Drost',
    license: 'CC BY 2.0',
  }, // LeBron James — LeBron James (51959977144) (cropped2).jpg
  'kobe bryant': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Kobe_Bryant_2015.jpg/330px-Kobe_Bryant_2015.jpg',
    author: 'Keith Allison from Hanover, MD, USA',
    license: 'CC BY-SA 2.0',
  }, // Kobe Bryant — Kobe Bryant 2015.jpg
  'serena williams': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Serena_Williams_at_2013_US_Open.jpg/330px-Serena_Williams_at_2013_US_Open.jpg',
    author: 'Edwin Martinez',
    license: 'CC BY 2.0',
  }, // Serena Williams — Serena Williams at 2013 US Open.jpg
  'simone biles': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Simone_Biles_National_Team_2024.jpg/330px-Simone_Biles_National_Team_2024.jpg',
    author: 'Ocoudis',
    license: 'CC BY-SA 4.0',
  }, // Simone Biles — Simone Biles National Team 2024.jpg
  'muhammad ali': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Muhammad_Ali_NYWTS.jpg/330px-Muhammad_Ali_NYWTS.jpg',
    author: 'Ira Rosenberg',
    license: 'Public domain',
  }, // Muhammad Ali — Muhammad Ali NYWTS.jpg
  'mike tyson': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Mike_Tyson_Photo_Op_GalaxyCon_Austin_2023.jpg/330px-Mike_Tyson_Photo_Op_GalaxyCon_Austin_2023.jpg',
    author: 'Super Festivals',
    license: 'CC BY 2.0',
  }, // Mike Tyson — Mike Tyson Photo Op GalaxyCon Austin 2023.jpg
  'rafael nadal': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Rafael_Nadal_en_2024_%28cropped%29.jpg/330px-Rafael_Nadal_en_2024_%28cropped%29.jpg',
    author: 'Barcex',
    license: 'CC BY-SA 4.0',
  }, // Rafael Nadal — Rafael Nadal en 2024 (cropped).jpg
  'cristiano ronaldo': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Cristiano_Ronaldo_Croatia_v_Portugal_2_July_2026-075_%28cropped%29.jpg/330px-Cristiano_Ronaldo_Croatia_v_Portugal_2_July_2026-075_%28cropped%29.jpg',
    author: 'Bryan Berlin',
    license: 'CC BY-SA 4.0',
  }, // Cristiano Ronaldo — Cristiano Ronaldo Croatia v Portugal 2 July 2026-075 (cropped).jpg
  'lionel messi': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Leo_Messi_Argentina_v_Egypt_7_July_2026-1.jpg/330px-Leo_Messi_Argentina_v_Egypt_7_July_2026-1.jpg',
    author: 'Bryan Berlin',
    license: 'CC BY-SA 4.0',
  }, // Lionel Messi — Leo Messi Argentina v Egypt 7 July 2026-1.jpg
  'diego maradona': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Argentina_celebrando_copa_%28cropped%29.jpg/330px-Argentina_celebrando_copa_%28cropped%29.jpg',
    author: 'Unknown authorUnknown author',
    license: 'Public domain',
  }, // Diego Maradona — Argentina celebrando copa (cropped).jpg
  // História, ciência e cultura
  'albert einstein': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Einstein_1921_by_F_Schmutzer_-_restoration.jpg/330px-Einstein_1921_by_F_Schmutzer_-_restoration.jpg',
    author: 'Ferdinand Schmutzer / Adam Cuerden',
    license: 'Public domain',
  }, // Albert Einstein — Einstein 1921 by F Schmutzer - restoration.jpg
  'marie curie': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Marie_Curie_%281900%29_%28cropped%29.jpg/330px-Marie_Curie_%281900%29_%28cropped%29.jpg',
    author: 'Unknown authorUnknown author',
    license: 'Public domain',
  }, // Marie Curie — Marie Curie (1900) (cropped).jpg
  'isaac newton': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/GodfreyKneller-IsaacNewton-1689.jpg/330px-GodfreyKneller-IsaacNewton-1689.jpg',
    author: 'James Thronill after Sir Godfrey Kneller',
    license: 'Public domain',
  }, // Isaac Newton — GodfreyKneller-IsaacNewton-1689.jpg
  'mahatma gandhi': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Mahatma-Gandhi%2C_studio%2C_1931.jpg/330px-Mahatma-Gandhi%2C_studio%2C_1931.jpg',
    author: 'Elliott &amp; Fry',
    license: 'Public domain',
  }, // Mahatma Gandhi — Mahatma-Gandhi, studio, 1931.jpg
  'nelson mandela': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Nelson_Mandela_1994.jpg/330px-Nelson_Mandela_1994.jpg',
    author: 'Kingkongphoto &amp; www.celebrity-photos.com from Laurel',
    license: 'CC BY-SA 2.0',
  }, // Nelson Mandela — Nelson Mandela 1994.jpg
  'martin luther king jr': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Martin_Luther_King%2C_Jr._and_Lyndon_Johnson_%28cropped%29.jpg/330px-Martin_Luther_King%2C_Jr._and_Lyndon_Johnson_%28cropped%29.jpg',
    author: 'Yoichi Okamoto',
    license: 'Public domain',
  }, // Martin Luther King Jr. — Martin Luther King, Jr. and Lyndon Johnson (cropped).jpg
  'abraham lincoln': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Abraham_Lincoln_O-77_matte_collodion_print.jpg/330px-Abraham_Lincoln_O-77_matte_collodion_print.jpg',
    author: 'Alexander Gardner',
    license: 'Public domain',
  }, // Abraham Lincoln — Abraham Lincoln O-77 matte collodion print.jpg
  'napoleao bonaparte': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Jacques-Louis_David_-_The_Emperor_Napoleon_in_His_Study_at_the_Tuileries_-_Google_Art_Project.jpg/330px-Jacques-Louis_David_-_The_Emperor_Napoleon_in_His_Study_at_the_Tuileries_-_Google_Art_Project.jpg',
    author: 'Jacques-Louis David',
    license: 'Public domain',
  }, // Napoleão Bonaparte — Jacques-Louis David - The Emperor Napoleon in His Study at the Tuileries - Google Art Project.jpg
  'steve jobs': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Steve_Jobs_Headshot_2010-CROP2.jpg/330px-Steve_Jobs_Headshot_2010-CROP2.jpg',
    author: 'MetalGearLiquid, based on File:Steve_Jobs_Headshot_2010-CROP.jpg made by Matt Yohe',
    license: 'CC BY-SA 3.0',
  }, // Steve Jobs — Steve Jobs Headshot 2010-CROP2.jpg
  'bill gates': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Bill_Gates_at_the_European_Commission_-_2025_-_P067383-987995_%28cropped%29.jpg/330px-Bill_Gates_at_the_European_Commission_-_2025_-_P067383-987995_%28cropped%29.jpg',
    author: 'Bogdan Hoyaux / European Union',
    license: 'CC BY 4.0',
  }, // Bill Gates — Bill Gates at the European Commission - 2025 - P067383-987995 (cropped).jpg
  'elon musk': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Elon_Musk_%2854816836217%29_%28cropped_2%29_%28b%29.jpg/330px-Elon_Musk_%2854816836217%29_%28cropped_2%29_%28b%29.jpg',
    author: 'Gage Skidmore',
    license: 'CC BY-SA 4.0',
  }, // Elon Musk — Elon Musk (54816836217) (cropped 2) (b).jpg
  'oprah winfrey': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Pre_Inaugural_Reception_%2852639556983%29_%28cropped%29.jpg/330px-Pre_Inaugural_Reception_%2852639556983%29_%28cropped%29.jpg',
    author: 'Maryland GovPics',
    license: 'CC BY 2.0',
  }, // Oprah Winfrey — Pre Inaugural Reception (52639556983) (cropped).jpg
  'walt disney': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Walt_Disney_1946.JPG/330px-Walt_Disney_1946.JPG',
    author: 'Boy Scouts of America',
    license: 'Public domain',
  }, // Walt Disney — Walt Disney 1946.JPG
  'stan lee': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Stan_Lee_December_2016.jpg/330px-Stan_Lee_December_2016.jpg',
    author: 'US Embassy Tokyo',
    license: 'Public domain',
  }, // Stan Lee — Stan Lee December 2016.jpg
  'george lucas': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/George_Lucas_cropped_2009.jpg/330px-George_Lucas_cropped_2009.jpg',
    author: 'nicolas genin',
    license: 'CC BY-SA 2.0',
  }, // George Lucas — George Lucas cropped 2009.jpg
  'steven spielberg': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Steven_Spielberg_2025.jpg/330px-Steven_Spielberg_2025.jpg',
    author: 'Raph_PH',
    license: 'CC BY 4.0',
  }, // Steven Spielberg — Steven Spielberg 2025.jpg
  'frida kahlo': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Frida_Kahlo%2C_by_Guillermo_Kahlo_%28cropped%29.jpg/330px-Frida_Kahlo%2C_by_Guillermo_Kahlo_%28cropped%29.jpg',
    author: 'Guillermo Kahlo',
    license: 'Public domain',
  }, // Frida Kahlo — Frida Kahlo, by Guillermo Kahlo (cropped).jpg
  'vincent van gogh': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Self-portrait_-_Vincent_van_Gogh.jpg/330px-Self-portrait_-_Vincent_van_Gogh.jpg',
    author: 'Vincent van Gogh',
    license: 'CC BY-SA 4.0',
  }, // Vincent van Gogh — Self-portrait - Vincent van Gogh.jpg
  // Literatura e mitologia
  'chapeleiro louco': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/MadlHatterByTenniel.svg/330px-MadlHatterByTenniel.svg.png',
    author: 'John Tenniel',
    license: 'Public domain',
  }, // Chapeleiro Louco — MadlHatterByTenniel.svg
  'atticus finch': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Gregory_Peck_Atticus_Publicity_Photo.jpg/330px-Gregory_Peck_Atticus_Publicity_Photo.jpg',
    author: 'Universal Pictures',
    license: 'Public domain',
  }, // Atticus Finch — Gregory Peck Atticus Publicity Photo.jpg
  'sancho panca': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/1879%2C_El_ingenioso_hidalgo_D._Quijote_de_la_Mancha%2C_Sancho_Panza%2C_Mestres_%28cropped%29.jpg/330px-1879%2C_El_ingenioso_hidalgo_D._Quijote_de_la_Mancha%2C_Sancho_Panza%2C_Mestres_%28cropped%29.jpg',
    author: 'Apel·les Mestres i Oñós',
    license: 'Public domain',
  }, // Sancho Pança — 1879, El ingenioso hidalgo D. Quijote de la Mancha, Sancho Panza, Mestres (cropped).jpg
  zeus: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Jupiter_J1a.jpg/330px-Jupiter_J1a.jpg',
    author: 'Jamain',
    license: 'CC BY-SA 4.0',
  }, // Zeus — Jupiter J1a.jpg
  medusa: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Medusa_by_Carvaggio.jpg/330px-Medusa_by_Carvaggio.jpg',
    author: 'Caravaggio',
    license: 'Public domain',
  }, // Medusa — Medusa by Carvaggio.jpg
};
