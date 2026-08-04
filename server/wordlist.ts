import { normalizeText } from './normalization';

export interface Character {
  id: string;
  name: string;
  category: string;
  aliases: string[];
}

interface CharacterSeed {
  name: string;
  category: string;
  aliases?: string[];
}

// Núcleo popular: personagens e nomes que a maioria das pessoas reconhece.
const characterSets: Record<string, string> = {
  Marvel: `Spider-Man|Iron Man|Captain America|Thor|Hulk|Black Widow|Black Panther|Doctor Strange|Captain Marvel|Scarlet Witch|Ant-Man|Loki|Thanos|Deadpool|Wolverine|Venom|Daredevil|Nick Fury|Green Goblin|Miles Morales`,
  DC: `Superman|Batman|Wonder Woman|Aquaman|Flash|Green Lantern|Supergirl|Robin|Cyborg|Shazam|Joker|Harley Quinn|Catwoman|Poison Ivy|Lex Luthor|Bane|Raven|Darkseid`,
  'Disney e Pixar': `Mickey Mouse|Minnie Mouse|Donald Duck|Goofy|Simba|Mufasa|Scar|Ariel|Ursula|Belle|Beast|Aladdin|Jasmine|Genie|Mulan|Moana|Elsa|Anna|Olaf|Stitch|Peter Pan|Cinderella|Maleficent|Woody|Buzz Lightyear|Lightning McQueen|Remy|WALL-E|Joy|Miguel Rivera`,
  Animação: `Bugs Bunny|Tom Cat|Jerry Mouse|Scooby-Doo|Shaggy Rogers|Homer Simpson|Bart Simpson|Lisa Simpson|Peter Griffin|Stewie Griffin|Rick Sanchez|Morty Smith|Aang|Zuko|SpongeBob SquarePants|Patrick Star|Finn the Human|Jake the Dog|Pica-Pau|Puss in Boots`,
  'Anime e mangá': `Goku|Vegeta|Gohan|Piccolo|Naruto Uzumaki|Sasuke Uchiha|Kakashi Hatake|Luffy|Roronoa Zoro|Nami|Sanji|Eren Yeager|Mikasa Ackerman|Levi Ackerman|Light Yagami|L|Tanjiro Kamado|Nezuko Kamado|Satoru Gojo|Sailor Moon|Ash Ketchum|Pikachu|Totoro`,
  Videogames: `Mario|Luigi|Princess Peach|Bowser|Yoshi|Link|Zelda|Kirby|Donkey Kong|Sonic the Hedgehog|Tails|Knuckles|Dr. Eggman|Mega Man|Ryu|Chun-Li|Lara Croft|Kratos|Master Chief|Solid Snake|Pac-Man|Steve (Minecraft)`,
  'Fantasia e ficção científica': `Frodo Baggins|Gandalf|Gollum|Sauron|Harry Potter|Hermione Granger|Ron Weasley|Albus Dumbledore|Severus Snape|Draco Malfoy|Voldemort|Katniss Everdeen|Luke Skywalker|Leia Organa|Han Solo|Chewbacca|Darth Vader|Yoda|Obi-Wan Kenobi|R2-D2|C-3PO|Rey|Neo|Trinity|Godzilla`,
  Cinema: `Forrest Gump|Indiana Jones|James Bond|Ethan Hunt|John Wick|Rocky Balboa|Rambo|Marty McFly|Doc Brown|Jack Sparrow|Willy Wonka|Mary Poppins|The Grinch|Kevin McCallister|Elle Woods|Vito Corleone|Michael Corleone|Tony Montana|Jules Winnfield|Beatrix Kiddo|Maximus|William Wallace|Shrek|Gru|Jack Skellington`,
  Séries: `Walter White|Jesse Pinkman|Saul Goodman|Sherlock Holmes|John Watson|Michael Scott|Dwight Schrute|Jim Halpert|Rachel Green|Ross Geller|Monica Geller|Chandler Bing|Joey Tribbiani|Dexter Morgan|Daenerys Targaryen|Jon Snow|Arya Stark|Tyrion Lannister|Eleven|Thomas Shelby|The Doctor`,
  'Ficção brasileira': `Emília|Narizinho|Dona Benta|Saci-Pererê|Mônica|Cebolinha|Cascão|Magali|Chico Bento|Chaves|Chapolin Colorado|Seu Madruga|Chiquinha|Kiko|Dona Florinda|Carminha|Odete Roitman|Nazaré Tedesco|João Grilo|Chicó`,
  Música: `Michael Jackson|Elvis Presley|Madonna|Beyoncé|Rihanna|Lady Gaga|Taylor Swift|Britney Spears|Bruno Mars|Adele|Amy Winehouse|Bob Marley|John Lennon|Paul McCartney|Freddie Mercury|David Bowie|Elton John|Whitney Houston|Anitta|Roberto Carlos`,
  Esportes: `Pelé|Marta|Neymar|Ronaldo Nazário|Ronaldinho Gaúcho|Romário|Ayrton Senna|Rebeca Andrade|Michael Jordan|LeBron James|Kobe Bryant|Serena Williams|Simone Biles|Usain Bolt|Muhammad Ali|Mike Tyson|Rafael Nadal|Cristiano Ronaldo|Lionel Messi|Diego Maradona`,
  'História, ciência e cultura': `Albert Einstein|Marie Curie|Isaac Newton|Leonardo da Vinci|Mahatma Gandhi|Nelson Mandela|Martin Luther King Jr.|Abraham Lincoln|Napoleon Bonaparte|Cleopatra|Steve Jobs|Bill Gates|Elon Musk|Oprah Winfrey|Walt Disney|Stan Lee|George Lucas|Steven Spielberg|Frida Kahlo|Vincent van Gogh`,
  'Literatura e mitologia': `Alice|Mad Hatter|Tom Sawyer|Jay Gatsby|Atticus Finch|Don Quixote|Sancho Panza|Dorian Gray|Oliver Twist|Ebenezer Scrooge|Jane Eyre|Elizabeth Bennet|Mr Darcy|Frankenstein|Dracula|Aslan|Matilda Wormwood|Zeus|Hades|Medusa`,
};

const aliasesByName: Record<string, string[]> = {
  'spider man': ['Spiderman', 'Peter Parker'],
  'iron man': ['Tony Stark'],
  'captain america': ['Steve Rogers'],
  hulk: ['Bruce Banner'],
  'black panther': ['TChalla', "T'Challa"],
  'doctor strange': ['Stephen Strange'],
  'captain marvel': ['Carol Danvers'],
  'scarlet witch': ['Wanda Maximoff'],
  'ant man': ['Scott Lang'],
  deadpool: ['Wade Wilson'],
  wolverine: ['Logan'],
  superman: ['Clark Kent'],
  batman: ['Bruce Wayne'],
  'wonder woman': ['Diana Prince'],
  flash: ['Barry Allen'],
  catwoman: ['Selina Kyle'],
  'harley quinn': ['Harleen Quinzel'],
  'mickey mouse': ['Mickey'],
  'spongebob squarepants': ['Bob Esponja', 'SpongeBob'],
  goku: ['Son Goku', 'Kakarotto'],
  'naruto uzumaki': ['Naruto'],
  luffy: ['Monkey D. Luffy'],
  'sailor moon': ['Usagi Tsukino'],
  'ash ketchum': ['Ash'],
  mario: ['Super Mario'],
  zelda: ['Princess Zelda'],
  'sonic the hedgehog': ['Sonic'],
  'dr eggman': ['Eggman'],
  'steve minecraft': ['Steve'],
  'harry potter': ['Harry'],
  'darth vader': ['Anakin Skywalker'],
  'r2 d2': ['R2D2'],
  'c 3 po': ['C3PO'],
  'james bond': ['007'],
  'marty mcfly': ['Marty'],
  'doc brown': ['Emmett Brown', 'Doc'],
  'jack sparrow': ['Captain Jack Sparrow'],
  'the grinch': ['Grinch'],
  'kevin mccallister': ['Kevin'],
  'walter white': ['Heisenberg'],
  'sherlock holmes': ['Sherlock'],
  'the doctor': ['Doctor Who'],
  'chaves': ['El Chavo'],
  'chapolin colorado': ['Chapolin'],
  kiko: ['Quico'],
  pele: ['Edson Arantes do Nascimento', 'Edson'],
  marta: ['Marta Vieira da Silva'],
  neymar: ['Neymar Jr', 'Neymar Junior'],
  'ronaldo nazario': ['Ronaldo'],
  'ronaldinho gaucho': ['Ronaldinho'],
  'ayrton senna': ['Senna'],
  'cristiano ronaldo': ['CR7'],
  'lionel messi': ['Messi'],
  'michael jackson': ['MJ'],
  'freddie mercury': ['Freddie'],
  anitta: ['Larissa de Macedo'],
  'albert einstein': ['Einstein'],
  'marie curie': ['Maria Sklodowska Curie'],
  'mahatma gandhi': ['Gandhi'],
  'martin luther king jr': ['MLK', 'Martin Luther King'],
  'steve jobs': ['Steve'],
  'walt disney': ['Disney'],
  'stan lee': ['Stanley Lieber'],
  'vincent van gogh': ['Van Gogh'],
  'mad hatter': ['Chapeleiro Maluco'],
  dracula: ['Count Dracula'],
};

const seeds: CharacterSeed[] = Object.entries(characterSets).flatMap(([category, names]) =>
  names.split('|').map((name) => ({
    name,
    category,
    aliases: aliasesByName[normalizeText(name)],
  })),
);

const uniqueSeeds = new Map<string, CharacterSeed>();
for (const seed of seeds) {
  const key = normalizeText(seed.name);
  if (key && !uniqueSeeds.has(key)) {
    uniqueSeeds.set(key, seed);
  }
}

export const characters: Character[] = Array.from(uniqueSeeds.values()).map((seed, index) => ({
  id: `character-${String(index + 1).padStart(4, '0')}`,
  name: seed.name,
  category: seed.category,
  aliases: seed.aliases ?? [],
}));

const MIN_CURATED_CHARACTERS = 250;
if (characters.length < MIN_CURATED_CHARACTERS) {
  throw new Error(
    `O catálogo popular precisa ter pelo menos ${MIN_CURATED_CHARACTERS} entradas; encontrada: ${characters.length}`,
  );
}

export function pickCharacters(amount: number): Character[] {
  const pool = [...characters];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = pool[index];
    pool[index] = pool[swapIndex]!;
    pool[swapIndex] = current!;
  }
  return pool.slice(0, amount);
}

export function characterMatches(character: Character, guess: string): boolean {
  const normalizedGuess = normalizeText(guess);
  return [character.name, ...character.aliases].some((answer) => normalizeText(answer) === normalizedGuess);
}
