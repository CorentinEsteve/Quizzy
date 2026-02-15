const text = (en, fr) => ({ en, fr });
const options = (en, fr) => ({ en, fr });

export const quizzes = [
  {
    id: "focus",
    categoryId: "general",
    categoryLabel: "General Knowledge",
    title: "Focus Sprint",
    subtitle: "40 quick questions",
    rounds: 40,
    accent: "#5E7CFF",
    questions: [
      {
        id: "f1",
        prompt: text("Which is a primary color?", "Quelle est une couleur primaire ?"),
        options: options(
          ["Green", "Blue", "Pink", "Black"],
          ["Vert", "Bleu", "Rose", "Noir"]
        ),
        answer: 1
      },
      {
        id: "f2",
        prompt: text(
          "Which planet is closest to the sun?",
          "Quelle planète est la plus proche du Soleil ?"
        ),
        options: options(
          ["Earth", "Venus", "Mercury", "Mars"],
          ["Terre", "Vénus", "Mercure", "Mars"]
        ),
        answer: 2
      },
      {
        id: "f3",
        prompt: text("Which is a mammal?", "Lequel est un mammifère ?"),
        options: options(
          ["Shark", "Dolphin", "Trout", "Eagle"],
          ["Requin", "Dauphin", "Truite", "Aigle"]
        ),
        answer: 1
      },
      {
        id: "f4",
        prompt: text("What is the capital of Japan?", "Quelle est la capitale du Japon ?"),
        options: options(
          ["Seoul", "Tokyo", "Kyoto", "Beijing"],
          ["Séoul", "Tokyo", "Kyoto", "Pékin"]
        ),
        answer: 1
      },
      {
        id: "f5",
        prompt: text(
          "Which gas do plants absorb from the air?",
          "Quel gaz les plantes absorbent-elles dans l'air ?"
        ),
        options: options(
          ["Oxygen", "Nitrogen", "Carbon dioxide", "Helium"],
          ["Oxygène", "Azote", "Dioxyde de carbone", "Hélium"]
        ),
        answer: 2
      },
      {
        id: "f6",
        prompt: text("How many continents are there?", "Combien y a-t-il de continents ?"),
        options: options(["5", "6", "7", "8"], ["5", "6", "7", "8"]),
        answer: 2
      },
      {
        id: "f7",
        prompt: text(
          "What is the largest ocean on Earth?",
          "Quel est le plus grand océan de la Terre ?"
        ),
        options: options(
          ["Atlantic", "Indian", "Arctic", "Pacific"],
          ["Atlantique", "Indien", "Arctique", "Pacifique"]
        ),
        answer: 3
      },
      {
        id: "f8",
        prompt: text(
          "Which instrument has black and white keys?",
          "Quel instrument a des touches noires et blanches ?"
        ),
        options: options(
          ["Violin", "Flute", "Piano", "Trumpet"],
          ["Violon", "Flûte", "Piano", "Trompette"]
        ),
        answer: 2
      },
      {
        id: "f9",
        prompt: text(
          "Which element has the chemical symbol O?",
          "Quel élément a pour symbole chimique O ?"
        ),
        options: options(
          ["Gold", "Oxygen", "Osmium", "Iron"],
          ["Or", "Oxygène", "Osmium", "Fer"]
        ),
        answer: 1
      },
      {
        id: "f10",
        prompt: text(
          "Which country is known for the city of Cairo?",
          "Quel pays est connu pour la ville du Caire ?"
        ),
        options: options(
          ["Greece", "Egypt", "Italy", "Turkey"],
          ["Grèce", "Égypte", "Italie", "Turquie"]
        ),
        answer: 1
      },
      {
        id: "f11",
        prompt: text("What is 9 x 7?", "Combien font 9 x 7 ?"),
        options: options(["56", "63", "72", "81"], ["56", "63", "72", "81"]),
        answer: 1
      },
      {
        id: "f12",
        prompt: text(
          "Which is the smallest prime number?",
          "Quel est le plus petit nombre premier ?"
        ),
        options: options(["1", "2", "3", "5"], ["1", "2", "3", "5"]),
        answer: 1
      },
      {
        id: "f13",
        prompt: text(
          "Which planet is known as the Red Planet?",
          "Quelle planète est connue comme la planète rouge ?"
        ),
        options: options(
          ["Mars", "Jupiter", "Venus", "Saturn"],
          ["Mars", "Jupiter", "Vénus", "Saturne"]
        ),
        answer: 0
      },
      {
        id: "f14",
        prompt: text("What do bees make?", "Que fabriquent les abeilles ?"),
        options: options(
          ["Wax", "Honey", "Silk", "Ink"],
          ["Cire", "Miel", "Soie", "Encre"]
        ),
        answer: 1
      },
      {
        id: "f15",
        prompt: text(
          "Which metal is liquid at room temperature?",
          "Quel métal est liquide à température ambiante ?"
        ),
        options: options(
          ["Iron", "Mercury", "Copper", "Aluminum"],
          ["Fer", "Mercure", "Cuivre", "Aluminium"]
        ),
        answer: 1
      },
      {
        id: "f16",
        prompt: text(
          "Which is the largest planet in our solar system?",
          "Quelle est la plus grande planète de notre système solaire ?"
        ),
        options: options(
          ["Earth", "Jupiter", "Saturn", "Neptune"],
          ["Terre", "Jupiter", "Saturne", "Neptune"]
        ),
        answer: 1
      },
      {
        id: "f17",
        prompt: text(
          "Which language is primarily spoken in Brazil?",
          "Quelle langue est principalement parlée au Brésil ?"
        ),
        options: options(
          ["Spanish", "Portuguese", "French", "English"],
          ["Espagnol", "Portugais", "Français", "Anglais"]
        ),
        answer: 1
      },
      {
        id: "f18",
        prompt: text(
          "Which organ pumps blood through the body?",
          "Quel organe pompe le sang dans le corps ?"
        ),
        options: options(
          ["Liver", "Heart", "Lung", "Kidney"],
          ["Foie", "Cœur", "Poumon", "Rein"]
        ),
        answer: 1
      },
      {
        id: "f19",
        prompt: text(
          "Which planet has the most visible rings?",
          "Quelle planète a les anneaux les plus visibles ?"
        ),
        options: options(
          ["Mars", "Saturn", "Uranus", "Neptune"],
          ["Mars", "Saturne", "Uranus", "Neptune"]
        ),
        answer: 1
      },
      {
        id: "f20",
        prompt: text(
          "What is the boiling point of water at sea level?",
          "Quel est le point d'ébullition de l'eau au niveau de la mer ?"
        ),
        options: options(["80 C", "90 C", "100 C", "110 C"], ["80 C", "90 C", "100 C", "110 C"]),
        answer: 2
      },
      {
        id: "f21",
        prompt: text(
          "Which is the longest river in South America?",
          "Quel est le plus long fleuve d'Amérique du Sud ?"
        ),
        options: options(
          ["Amazon", "Nile", "Yangtze", "Danube"],
          ["Amazone", "Nil", "Yangtsé", "Danube"]
        ),
        answer: 0
      },
      {
        id: "f22",
        prompt: text("Who wrote 'Romeo and Juliet'?", "Qui a écrit 'Roméo et Juliette' ?"),
        options: options(
          ["Charles Dickens", "William Shakespeare", "Mark Twain", "Jane Austen"],
          ["Charles Dickens", "William Shakespeare", "Mark Twain", "Jane Austen"]
        ),
        answer: 1
      },
      {
        id: "f23",
        prompt: text("Which shape has four equal sides?", "Quelle forme a quatre côtés égaux ?"),
        options: options(
          ["Rectangle", "Triangle", "Square", "Pentagon"],
          ["Rectangle", "Triangle", "Carré", "Pentagone"]
        ),
        answer: 2
      },
      {
        id: "f24",
        prompt: text("What is the largest mammal?", "Quel est le plus grand mammifère ?"),
        options: options(
          ["Elephant", "Blue whale", "Giraffe", "Hippopotamus"],
          ["Éléphant", "Baleine bleue", "Girafe", "Hippopotame"]
        ),
        answer: 1
      },
      {
        id: "f25",
        prompt: text(
          "Which planet is known for its great red spot?",
          "Quelle planète est connue pour sa Grande Tache rouge ?"
        ),
        options: options(
          ["Jupiter", "Mars", "Neptune", "Mercury"],
          ["Jupiter", "Mars", "Neptune", "Mercure"]
        ),
        answer: 0
      },
      {
        id: "f26",
        prompt: text(
          "Which country is famous for the Eiffel Tower?",
          "Quel pays est célèbre pour la tour Eiffel ?"
        ),
        options: options(
          ["Germany", "France", "Spain", "Belgium"],
          ["Allemagne", "France", "Espagne", "Belgique"]
        ),
        answer: 1
      },
      {
        id: "f27",
        prompt: text(
          "How many degrees are in a right angle?",
          "Combien de degrés y a-t-il dans un angle droit ?"
        ),
        options: options(["45", "90", "120", "180"], ["45", "90", "120", "180"]),
        answer: 1
      },
      {
        id: "f28",
        prompt: text(
          "Which is the hardest natural substance?",
          "Quelle est la substance naturelle la plus dure ?"
        ),
        options: options(
          ["Gold", "Diamond", "Iron", "Quartz"],
          ["Or", "Diamant", "Fer", "Quartz"]
        ),
        answer: 1
      },
      {
        id: "f29",
        prompt: text(
          "Which continent is the Sahara Desert in?",
          "Sur quel continent se trouve le désert du Sahara ?"
        ),
        options: options(
          ["Asia", "Africa", "Australia", "South America"],
          ["Asie", "Afrique", "Australie", "Amérique du Sud"]
        ),
        answer: 1
      },
      {
        id: "f30",
        prompt: text("What is the chemical symbol for water?", "Quel est le symbole chimique de l'eau ?"),
        options: options(["CO2", "H2O", "O2", "NaCl"], ["CO2", "H2O", "O2", "NaCl"]),
        answer: 1
      },
      {
        id: "f31",
        prompt: text(
          "Which is the tallest mountain on Earth?",
          "Quelle est la plus haute montagne du monde ?"
        ),
        options: options(
          ["K2", "Mount Everest", "Kilimanjaro", "Denali"],
          ["K2", "Mont Everest", "Kilimandjaro", "Denali"]
        ),
        answer: 1
      },
      {
        id: "f32",
        prompt: text(
          "Which part of the plant conducts photosynthesis?",
          "Quelle partie de la plante fait la photosynthèse ?"
        ),
        options: options(
          ["Root", "Stem", "Leaf", "Flower"],
          ["Racine", "Tige", "Feuille", "Fleur"]
        ),
        answer: 2
      },
      {
        id: "f33",
        prompt: text(
          "What is the main gas in Earth's atmosphere?",
          "Quel est le gaz principal de l'atmosphère terrestre ?"
        ),
        options: options(
          ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"],
          ["Oxygène", "Azote", "Dioxyde de carbone", "Hydrogène"]
        ),
        answer: 1
      },
      {
        id: "f34",
        prompt: text(
          "Which ancient civilization built the pyramids of Giza?",
          "Quelle civilisation ancienne a construit les pyramides de Gizeh ?"
        ),
        options: options(
          ["Roman", "Greek", "Egyptian", "Mayan"],
          ["Romaine", "Grecque", "Égyptienne", "Maya"]
        ),
        answer: 2
      },
      {
        id: "f35",
        prompt: text(
          "Which is the smallest continent by land area?",
          "Quel est le plus petit continent par superficie ?"
        ),
        options: options(
          ["Europe", "Australia", "Antarctica", "South America"],
          ["Europe", "Australie", "Antarctique", "Amérique du Sud"]
        ),
        answer: 1
      },
      {
        id: "f36",
        prompt: text(
          "Which instrument measures atmospheric pressure?",
          "Quel instrument mesure la pression atmosphérique ?"
        ),
        options: options(
          ["Thermometer", "Barometer", "Hygrometer", "Anemometer"],
          ["Thermomètre", "Baromètre", "Hygromètre", "Anémomètre"]
        ),
        answer: 1
      },
      {
        id: "f37",
        prompt: text(
          "Which body part is responsible for hearing?",
          "Quelle partie du corps est responsable de l'audition ?"
        ),
        options: options(
          ["Eye", "Ear", "Nose", "Skin"],
          ["Œil", "Oreille", "Nez", "Peau"]
        ),
        answer: 1
      },
      {
        id: "f38",
        prompt: text(
          "Which country has the maple leaf on its flag?",
          "Quel pays a une feuille d'érable sur son drapeau ?"
        ),
        options: options(
          ["Canada", "Norway", "Austria", "Ireland"],
          ["Canada", "Norvège", "Autriche", "Irlande"]
        ),
        answer: 0
      },
      {
        id: "f39",
        prompt: text(
          "Which is the largest internal organ in the human body?",
          "Quel est le plus grand organe interne du corps humain ?"
        ),
        options: options(
          ["Brain", "Liver", "Heart", "Lung"],
          ["Cerveau", "Foie", "Cœur", "Poumon"]
        ),
        answer: 1
      },
      {
        id: "f40",
        prompt: text(
          "What is the freezing point of water at sea level?",
          "Quel est le point de congélation de l'eau au niveau de la mer ?"
        ),
        options: options(["0 C", "10 C", "32 C", "-10 C"], ["0 C", "10 C", "32 C", "-10 C"]),
        answer: 0
      }
    ]
  },
  {
    id: "logic",
    categoryId: "logic",
    categoryLabel: "Logic & Patterns",
    title: "Logic Flow",
    subtitle: "30 logic challenges",
    rounds: 30,
    accent: "#2EC4B6",
    questions: [
      {
        id: "l1",
        prompt: text("What comes next: 2, 4, 8, 16, ?", "Quelle est la suite : 2, 4, 8, 16, ?"),
        options: options(["18", "24", "32", "36"], ["18", "24", "32", "36"]),
        answer: 2
      },
      {
        id: "l2",
        prompt: text("Which shape has 6 sides?", "Quelle forme a 6 côtés ?"),
        options: options(
          ["Pentagon", "Hexagon", "Octagon", "Heptagon"],
          ["Pentagone", "Hexagone", "Octogone", "Heptagone"]
        ),
        answer: 1
      },
      {
        id: "l3",
        prompt: text("What comes next: 3, 6, 12, 24, ?", "Quelle est la suite : 3, 6, 12, 24, ?"),
        options: options(["30", "36", "48", "60"], ["30", "36", "48", "60"]),
        answer: 2
      },
      {
        id: "l4",
        prompt: text(
          "Find the odd one out: square, cube, rectangle, triangle",
          "Trouvez l'intrus : carré, cube, rectangle, triangle"
        ),
        options: options(
          ["Square", "Cube", "Rectangle", "Triangle"],
          ["Carré", "Cube", "Rectangle", "Triangle"]
        ),
        answer: 1
      },
      {
        id: "l5",
        prompt: text(
          "If all bloops are razzies and all razzies are lazzies, are all bloops lazzies?",
          "Si tous les bloops sont des razzies et que toutes les razzies sont des lazzies, tous les bloops sont-ils des lazzies ?"
        ),
        options: options(
          ["Yes", "No", "Cannot tell", "Only sometimes"],
          ["Oui", "Non", "Impossible à dire", "Seulement parfois"]
        ),
        answer: 0
      },
      {
        id: "l6",
        prompt: text("What comes next: 1, 1, 2, 3, 5, 8, ?", "Quelle est la suite : 1, 1, 2, 3, 5, 8, ?"),
        options: options(["11", "12", "13", "15"], ["11", "12", "13", "15"]),
        answer: 2
      },
      {
        id: "l7",
        prompt: text("Which number is missing: 5, 10, 20, 40, ?", "Quel nombre manque : 5, 10, 20, 40, ?"),
        options: options(["45", "60", "80", "100"], ["45", "60", "80", "100"]),
        answer: 2
      },
      {
        id: "l8",
        prompt: text(
          "If A = 1, B = 2, C = 3, what is D + E?",
          "Si A = 1, B = 2, C = 3, combien font D + E ?"
        ),
        options: options(["7", "8", "9", "10"], ["7", "8", "9", "10"]),
        answer: 2
      },
      {
        id: "l9",
        prompt: text("What comes next: 9, 7, 5, 3, ?", "Quelle est la suite : 9, 7, 5, 3, ?"),
        options: options(["1", "0", "2", "4"], ["1", "0", "2", "4"]),
        answer: 0
      },
      {
        id: "l10",
        prompt: text(
          "Which word does NOT belong? Apple, Banana, Carrot, Grape",
          "Quel mot n'appartient pas au groupe ? Pomme, Banane, Carotte, Raisin"
        ),
        options: options(
          ["Apple", "Banana", "Carrot", "Grape"],
          ["Pomme", "Banane", "Carotte", "Raisin"]
        ),
        answer: 2
      },
      {
        id: "l11",
        prompt: text(
          "If it takes 2 minutes to boil 1 egg, how long to boil 3 eggs at once?",
          "S'il faut 2 minutes pour cuire 1 œuf, combien de temps pour cuire 3 œufs en même temps ?"
        ),
        options: options(
          ["2 minutes", "3 minutes", "4 minutes", "6 minutes"],
          ["2 minutes", "3 minutes", "4 minutes", "6 minutes"]
        ),
        answer: 0
      },
      {
        id: "l12",
        prompt: text("Which comes next: A, C, E, G, ?", "Quelle est la suite : A, C, E, G, ?"),
        options: options(["H", "I", "J", "K"], ["H", "I", "J", "K"]),
        answer: 1
      },
      {
        id: "l13",
        prompt: text("Find the missing number: 2, 3, 5, 8, 12, ?", "Trouvez le nombre manquant : 2, 3, 5, 8, 12, ?"),
        options: options(["15", "17", "18", "20"], ["15", "17", "18", "20"]),
        answer: 1
      },
      {
        id: "l14",
        prompt: text(
          "Which number is the odd one out: 2, 4, 8, 9, 16",
          "Quel nombre est l'intrus : 2, 4, 8, 9, 16"
        ),
        options: options(["2", "4", "8", "9"], ["2", "4", "8", "9"]),
        answer: 3
      },
      {
        id: "l15",
        prompt: text(
          "If all zebras are striped and some striped animals are horses, are all zebras horses?",
          "Si tous les zèbres sont rayés et que certains animaux rayés sont des chevaux, tous les zèbres sont-ils des chevaux ?"
        ),
        options: options(
          ["Yes", "No", "Cannot tell", "Only if striped"],
          ["Oui", "Non", "Impossible à dire", "Seulement s'ils sont rayés"]
        ),
        answer: 1
      },
      {
        id: "l16",
        prompt: text("What comes next: 4, 9, 16, 25, ?", "Quelle est la suite : 4, 9, 16, 25, ?"),
        options: options(["30", "36", "49", "64"], ["30", "36", "49", "64"]),
        answer: 1
      },
      {
        id: "l17",
        prompt: text(
          "If today is Tuesday, what day will it be 9 days from now?",
          "Si aujourd'hui est mardi, quel jour sera-t-il dans 9 jours ?"
        ),
        options: options(
          ["Wednesday", "Thursday", "Friday", "Saturday"],
          ["Mercredi", "Jeudi", "Vendredi", "Samedi"]
        ),
        answer: 1
      },
      {
        id: "l18",
        prompt: text(
          "If A is taller than B and B is taller than C, who is tallest?",
          "Si A est plus grand que B et B est plus grand que C, qui est le plus grand ?"
        ),
        options: options(
          ["A", "B", "C", "Cannot tell"],
          ["A", "B", "C", "Impossible à dire"]
        ),
        answer: 0
      },
      {
        id: "l19",
        prompt: text(
          "Which number completes the pattern: 2, 5, 10, 17, 26, ?",
          "Quel nombre complète la suite : 2, 5, 10, 17, 26, ?"
        ),
        options: options(["33", "35", "37", "39"], ["33", "35", "37", "39"]),
        answer: 2
      },
      {
        id: "l20",
        prompt: text(
          "If some cats are black and all black cats are fast, are some cats fast?",
          "Si certains chats sont noirs et que tous les chats noirs sont rapides, certains chats sont-ils rapides ?"
        ),
        options: options(
          ["Yes", "No", "Cannot tell", "Only if all cats are black"],
          ["Oui", "Non", "Impossible à dire", "Seulement si tous les chats sont noirs"]
        ),
        answer: 0
      },
      {
        id: "l21",
        prompt: text("Find the missing number: 10, 8, 6, 4, ?", "Trouvez le nombre manquant : 10, 8, 6, 4, ?"),
        options: options(["1", "2", "3", "5"], ["1", "2", "3", "5"]),
        answer: 1
      },
      {
        id: "l22",
        prompt: text("What comes next: 2, 3, 5, 7, 11, ?", "Quelle est la suite : 2, 3, 5, 7, 11, ?"),
        options: options(["12", "13", "14", "15"], ["12", "13", "14", "15"]),
        answer: 1
      },
      {
        id: "l23",
        prompt: text(
          "Which word is the odd one out? Circle, Triangle, Square, Cylinder",
          "Quel mot est l'intrus ? Cercle, Triangle, Carré, Cylindre"
        ),
        options: options(
          ["Circle", "Triangle", "Square", "Cylinder"],
          ["Cercle", "Triangle", "Carré", "Cylindre"]
        ),
        answer: 3
      },
      {
        id: "l24",
        prompt: text(
          "If 5 workers finish a job in 10 days, how long for 10 workers?",
          "Si 5 travailleurs terminent un travail en 10 jours, combien de temps pour 10 travailleurs ?"
        ),
        options: options(["5 days", "10 days", "15 days", "20 days"], ["5 jours", "10 jours", "15 jours", "20 jours"]),
        answer: 0
      },
      {
        id: "l25",
        prompt: text("What comes next: 100, 50, 25, 12.5, ?", "Quelle est la suite : 100, 50, 25, 12,5, ?"),
        options: options(["6.25", "7.5", "10", "15"], ["6,25", "7,5", "10", "15"]),
        answer: 0
      },
      {
        id: "l26",
        prompt: text(
          "Which number completes the pattern: 1, 3, 6, 10, 15, ?",
          "Quel nombre complète la suite : 1, 3, 6, 10, 15, ?"
        ),
        options: options(["18", "20", "21", "25"], ["18", "20", "21", "25"]),
        answer: 2
      },
      {
        id: "l27",
        prompt: text(
          "If all roses are flowers and some flowers fade quickly, do some roses fade quickly?",
          "Si toutes les roses sont des fleurs et que certaines fleurs fanent vite, certaines roses fanent-elles vite ?"
        ),
        options: options(
          ["Yes", "No", "Cannot tell", "Only in winter"],
          ["Oui", "Non", "Impossible à dire", "Seulement en hiver"]
        ),
        answer: 2
      },
      {
        id: "l28",
        prompt: text(
          "Which is the odd one out: 11, 13, 17, 19, 21",
          "Quel nombre est l'intrus : 11, 13, 17, 19, 21"
        ),
        options: options(["11", "13", "17", "21"], ["11", "13", "17", "21"]),
        answer: 3
      },
      {
        id: "l29",
        prompt: text("What comes next: 5, 7, 10, 14, 19, ?", "Quelle est la suite : 5, 7, 10, 14, 19, ?"),
        options: options(["23", "24", "25", "26"], ["23", "24", "25", "26"]),
        answer: 2
      },
      {
        id: "l30",
        prompt: text(
          "If you rearrange the letters in 'SILENT', you get:",
          "Si vous réarrangez les lettres de 'SILENT', vous obtenez :"
        ),
        options: options(
          ["LISTEN", "ENLIST", "TINSEL", "All of these"],
          ["LISTEN", "ENLIST", "TINSEL", "Toutes ces réponses"]
        ),
        answer: 3
      }
    ]
  },
  {
    id: "science",
    categoryId: "science",
    categoryLabel: "Science & Space",
    title: "Science & Space",
    subtitle: "20 discoveries and facts",
    rounds: 20,
    accent: "#FF9F43",
    questions: [
      {
        id: "s1",
        prompt: text("Which planet is known as the Blue Planet?", "Quelle planète est connue comme la planète bleue ?"),
        options: options(["Earth", "Neptune", "Uranus", "Venus"], ["Terre", "Neptune", "Uranus", "Vénus"]),
        answer: 0
      },
      {
        id: "s2",
        prompt: text("What is the center of an atom called?", "Comment s'appelle le centre d'un atome ?"),
        options: options(["Electron", "Nucleus", "Proton", "Orbit"], ["Électron", "Noyau", "Proton", "Orbite"]),
        answer: 1
      },
      {
        id: "s3",
        prompt: text("Which gas do humans need to breathe?", "Quel gaz les humains doivent-ils respirer ?"),
        options: options(["Carbon dioxide", "Oxygen", "Nitrogen", "Helium"], ["Dioxyde de carbone", "Oxygène", "Azote", "Hélium"]),
        answer: 1
      },
      {
        id: "s4",
        prompt: text("What is the chemical symbol for hydrogen?", "Quel est le symbole chimique de l'hydrogène ?"),
        options: options(["H", "He", "Hy", "Hg"], ["H", "He", "Hy", "Hg"]),
        answer: 0
      },
      {
        id: "s5",
        prompt: text("What is the chemical symbol for sodium?", "Quel est le symbole chimique du sodium ?"),
        options: options(["S", "So", "Na", "Sn"], ["S", "So", "Na", "Sn"]),
        answer: 2
      },
      {
        id: "s6",
        prompt: text("What force pulls objects toward Earth?", "Quelle force attire les objets vers la Terre ?"),
        options: options(["Magnetism", "Gravity", "Friction", "Radiation"], ["Magnétisme", "Gravité", "Frottement", "Rayonnement"]),
        answer: 1
      },
      {
        id: "s7",
        prompt: text("What is the powerhouse of the cell?", "Quelle est la centrale énergétique de la cellule ?"),
        options: options(["Nucleus", "Mitochondria", "Ribosome", "Chloroplast"], ["Noyau", "Mitochondrie", "Ribosome", "Chloroplaste"]),
        answer: 1
      },
      {
        id: "s8",
        prompt: text("What process do plants use to make food?", "Quel processus les plantes utilisent-elles pour fabriquer leur nourriture ?"),
        options: options(["Respiration", "Photosynthesis", "Fermentation", "Digestion"], ["Respiration", "Photosynthèse", "Fermentation", "Digestion"]),
        answer: 1
      },
      {
        id: "s9",
        prompt: text("A pattern of stars in the sky is called a:", "Un ensemble d'étoiles dans le ciel s'appelle :"),
        options: options(["Constellation", "Galaxy", "Orbit", "Comet"], ["Constellation", "Galaxie", "Orbite", "Comète"]),
        answer: 0
      },
      {
        id: "s10",
        prompt: text("What is the closest star to Earth?", "Quelle est l'étoile la plus proche de la Terre ?"),
        options: options(["Alpha Centauri", "The Sun", "Sirius", "Polaris"], ["Alpha du Centaure", "Le Soleil", "Sirius", "Polaris"]),
        answer: 1
      },
      {
        id: "s11",
        prompt: text("Earth completes one orbit around the Sun in about:", "La Terre effectue une orbite autour du Soleil en environ :"),
        options: options(["1 day", "1 month", "1 year", "10 years"], ["1 jour", "1 mois", "1 an", "10 ans"]),
        answer: 2
      },
      {
        id: "s12",
        prompt: text("Animals that eat both plants and animals are called:", "Les animaux qui mangent des plantes et des animaux sont appelés :"),
        options: options(["Herbivores", "Carnivores", "Omnivores", "Detritivores"], ["Herbivores", "Carnivores", "Omnivores", "Détritivores"]),
        answer: 2
      },
      {
        id: "s13",
        prompt: text("Which instrument measures temperature?", "Quel instrument mesure la température ?"),
        options: options(["Barometer", "Thermometer", "Hygrometer", "Altimeter"], ["Baromètre", "Thermomètre", "Hygromètre", "Altimètre"]),
        answer: 1
      },
      {
        id: "s14",
        prompt: text("Which planet has a day longer than its year?", "Quelle planète a un jour plus long que son année ?"),
        options: options(["Mars", "Mercury", "Venus", "Jupiter"], ["Mars", "Mercure", "Vénus", "Jupiter"]),
        answer: 2
      },
      {
        id: "s15",
        prompt: text("When a solid turns into a liquid, it is called:", "Quand un solide devient un liquide, on appelle cela :"),
        options: options(["Freezing", "Melting", "Condensing", "Subliming"], ["Congélation", "Fusion", "Condensation", "Sublimation"]),
        answer: 1
      },
      {
        id: "s16",
        prompt: text("When a gas turns into a liquid, it is called:", "Quand un gaz devient un liquide, on appelle cela :"),
        options: options(["Condensation", "Evaporation", "Combustion", "Fusion"], ["Condensation", "Évaporation", "Combustion", "Fusion"]),
        answer: 0
      },
      {
        id: "s17",
        prompt: text("Lightning is a form of:", "La foudre est une forme de :"),
        options: options(["Magnetism", "Electricity", "Gravity", "Sound"], ["Magnétisme", "Électricité", "Gravité", "Son"]),
        answer: 1
      },
      {
        id: "s18",
        prompt: text("Which device is used to see very small objects?", "Quel appareil est utilisé pour voir de très petits objets ?"),
        options: options(["Telescope", "Microscope", "Periscope", "Spectrometer"], ["Télescope", "Microscope", "Périscope", "Spectromètre"]),
        answer: 1
      },
      {
        id: "s19",
        prompt: text("What is the largest organ of the human body?", "Quel est le plus grand organe du corps humain ?"),
        options: options(["Skin", "Liver", "Heart", "Lung"], ["Peau", "Foie", "Cœur", "Poumon"]),
        answer: 0
      },
      {
        id: "s20",
        prompt: text("What is the main gas found in the Sun?", "Quel est le gaz principal du Soleil ?"),
        options: options(["Hydrogen", "Oxygen", "Carbon dioxide", "Nitrogen"], ["Hydrogène", "Oxygène", "Dioxyde de carbone", "Azote"]),
        answer: 0
      }
    ]
  },
  {
    id: "geography",
    categoryId: "geography",
    categoryLabel: "World Geography",
    title: "World Geography",
    subtitle: "20 place-based picks",
    rounds: 20,
    accent: "#00B894",
    questions: [
      {
        id: "g1",
        prompt: text("What is the capital of Canada?", "Quelle est la capitale du Canada ?"),
        options: options(["Toronto", "Ottawa", "Vancouver", "Montreal"], ["Toronto", "Ottawa", "Vancouver", "Montréal"]),
        answer: 1
      },
      {
        id: "g2",
        prompt: text("Which is the largest continent by area?", "Quel est le plus grand continent par superficie ?"),
        options: options(["Africa", "Asia", "Europe", "South America"], ["Afrique", "Asie", "Europe", "Amérique du Sud"]),
        answer: 1
      },
      {
        id: "g3",
        prompt: text("Which river flows through Paris?", "Quel fleuve traverse Paris ?"),
        options: options(["Thames", "Seine", "Danube", "Rhine"], ["Tamise", "Seine", "Danube", "Rhin"]),
        answer: 1
      },
      {
        id: "g4",
        prompt: text("Mount Everest is part of which mountain range?", "Le mont Everest fait partie de quelle chaîne de montagnes ?"),
        options: options(["Andes", "Alps", "Himalayas", "Rockies"], ["Andes", "Alpes", "Himalaya", "Rocheuses"]),
        answer: 2
      },
      {
        id: "g5",
        prompt: text("The Great Barrier Reef is off the coast of which country?", "La Grande Barrière de corail se trouve au large de quel pays ?"),
        options: options(["Australia", "South Africa", "Mexico", "Indonesia"], ["Australie", "Afrique du Sud", "Mexique", "Indonésie"]),
        answer: 0
      },
      {
        id: "g6",
        prompt: text("What is the capital of Italy?", "Quelle est la capitale de l'Italie ?"),
        options: options(["Venice", "Rome", "Milan", "Florence"], ["Venise", "Rome", "Milan", "Florence"]),
        answer: 1
      },
      {
        id: "g7",
        prompt: text("The Gobi Desert is primarily in which two countries?", "Le désert de Gobi se trouve principalement dans quels deux pays ?"),
        options: options(
          ["China and Mongolia", "India and Pakistan", "Iran and Iraq", "Turkey and Syria"],
          ["Chine et Mongolie", "Inde et Pakistan", "Iran et Irak", "Turquie et Syrie"]
        ),
        answer: 0
      },
      {
        id: "g8",
        prompt: text("The Nile River flows into which sea?", "Le Nil se jette dans quelle mer ?"),
        options: options(["Black Sea", "Red Sea", "Mediterranean Sea", "Arabian Sea"], ["Mer Noire", "Mer Rouge", "Mer Méditerranée", "Mer d'Arabie"]),
        answer: 2
      },
      {
        id: "g9",
        prompt: text("Which is the smallest ocean?", "Quel est le plus petit océan ?"),
        options: options(["Arctic", "Indian", "Atlantic", "Southern"], ["Arctique", "Indien", "Atlantique", "Austral"]),
        answer: 0
      },
      {
        id: "g10",
        prompt: text("Which country is often described as boot-shaped?", "Quel pays est souvent décrit comme ayant la forme d'une botte ?"),
        options: options(["Italy", "Greece", "Portugal", "Croatia"], ["Italie", "Grèce", "Portugal", "Croatie"]),
        answer: 0
      },
      {
        id: "g11",
        prompt: text("Big Ben is located in which city?", "Big Ben se trouve dans quelle ville ?"),
        options: options(["London", "Dublin", "Edinburgh", "Cardiff"], ["Londres", "Dublin", "Édimbourg", "Cardiff"]),
        answer: 0
      },
      {
        id: "g12",
        prompt: text("What is the capital of Brazil?", "Quelle est la capitale du Brésil ?"),
        options: options(["Rio de Janeiro", "Sao Paulo", "Brasilia", "Salvador"], ["Rio de Janeiro", "São Paulo", "Brasilia", "Salvador"]),
        answer: 2
      },
      {
        id: "g13",
        prompt: text("The Andes mountains are in which continent?", "Les montagnes des Andes se trouvent sur quel continent ?"),
        options: options(["North America", "South America", "Europe", "Asia"], ["Amérique du Nord", "Amérique du Sud", "Europe", "Asie"]),
        answer: 1
      },
      {
        id: "g14",
        prompt: text("Which US state is nicknamed the Sunshine State?", "Quel État américain est surnommé l'État du Soleil ?"),
        options: options(["California", "Florida", "Arizona", "Texas"], ["Californie", "Floride", "Arizona", "Texas"]),
        answer: 1
      },
      {
        id: "g15",
        prompt: text("Marrakech is a city in which country?", "Marrakech est une ville de quel pays ?"),
        options: options(["Morocco", "Tunisia", "Spain", "Algeria"], ["Maroc", "Tunisie", "Espagne", "Algérie"]),
        answer: 0
      },
      {
        id: "g16",
        prompt: text("The Danube River flows into which sea?", "Le Danube se jette dans quelle mer ?"),
        options: options(["Adriatic Sea", "Black Sea", "Baltic Sea", "Aegean Sea"], ["Mer Adriatique", "Mer Noire", "Mer Baltique", "Mer Égée"]),
        answer: 1
      },
      {
        id: "g17",
        prompt: text("Which continent has the most countries?", "Quel continent compte le plus de pays ?"),
        options: options(["Africa", "Asia", "Europe", "South America"], ["Afrique", "Asie", "Europe", "Amérique du Sud"]),
        answer: 0
      },
      {
        id: "g18",
        prompt: text("What is the capital of New Zealand?", "Quelle est la capitale de la Nouvelle-Zélande ?"),
        options: options(["Auckland", "Wellington", "Christchurch", "Dunedin"], ["Auckland", "Wellington", "Christchurch", "Dunedin"]),
        answer: 1
      },
      {
        id: "g19",
        prompt: text("Iceland is located in which ocean?", "L'Islande se situe dans quel océan ?"),
        options: options(["Pacific", "Atlantic", "Indian", "Arctic"], ["Pacifique", "Atlantique", "Indien", "Arctique"]),
        answer: 1
      },
      {
        id: "g20",
        prompt: text("Which river runs through Egypt?", "Quel fleuve traverse l'Égypte ?"),
        options: options(["Nile", "Tigris", "Euphrates", "Jordan"], ["Nil", "Tigre", "Euphrate", "Jourdain"]),
        answer: 0
      }
    ]
  },
  {
    id: "history",
    categoryId: "history",
    categoryLabel: "History & Culture",
    title: "History Highlights",
    subtitle: "20 moments in time",
    rounds: 20,
    accent: "#F39C12",
    questions: [
      {
        id: "h1",
        prompt: text("Who was the first president of the United States?", "Qui était le premier président des États-Unis ?"),
        options: options(["George Washington", "Thomas Jefferson", "John Adams", "Abraham Lincoln"], ["George Washington", "Thomas Jefferson", "John Adams", "Abraham Lincoln"]),
        answer: 0
      },
      {
        id: "h2",
        prompt: text("The Great Wall was built in which country?", "La Grande Muraille a été construite dans quel pays ?"),
        options: options(["China", "India", "Japan", "Korea"], ["Chine", "Inde", "Japon", "Corée"]),
        answer: 0
      },
      {
        id: "h3",
        prompt: text("The Renaissance began in which country?", "La Renaissance a commencé dans quel pays ?"),
        options: options(["France", "Italy", "Germany", "Spain"], ["France", "Italie", "Allemagne", "Espagne"]),
        answer: 1
      },
      {
        id: "h4",
        prompt: text("Machu Picchu was built by which civilization?", "Machu Picchu a été construit par quelle civilisation ?"),
        options: options(["Aztec", "Inca", "Maya", "Olmec"], ["Aztèque", "Inca", "Maya", "Olmèque"]),
        answer: 1
      },
      {
        id: "h5",
        prompt: text("Who invented the printing press in Europe?", "Qui a inventé l'imprimerie en Europe ?"),
        options: options(["Galileo", "Gutenberg", "Newton", "Da Vinci"], ["Galilée", "Gutenberg", "Newton", "Léonard de Vinci"]),
        answer: 1
      },
      {
        id: "h6",
        prompt: text("The Colosseum was built by which empire?", "Le Colisée a été construit par quel empire ?"),
        options: options(["Greek", "Roman", "Persian", "Ottoman"], ["Grec", "Romain", "Perse", "Ottoman"]),
        answer: 1
      },
      {
        id: "h7",
        prompt: text("Who wrote the Declaration of Independence?", "Qui a rédigé la Déclaration d'indépendance ?"),
        options: options(["Benjamin Franklin", "Thomas Jefferson", "James Madison", "John Hancock"], ["Benjamin Franklin", "Thomas Jefferson", "James Madison", "John Hancock"]),
        answer: 1
      },
      {
        id: "h8",
        prompt: text("The ancient Olympic Games originated in which country?", "Les Jeux olympiques antiques sont nés dans quel pays ?"),
        options: options(["Italy", "Greece", "Egypt", "Turkey"], ["Italie", "Grèce", "Égypte", "Turquie"]),
        answer: 1
      },
      {
        id: "h9",
        prompt: text("Which war was fought between the North and South in the US?", "Quelle guerre a opposé le Nord et le Sud aux États-Unis ?"),
        options: options(["Revolutionary War", "Civil War", "World War I", "War of 1812"], ["Guerre d'indépendance", "Guerre de Sécession", "Première Guerre mondiale", "Guerre de 1812"]),
        answer: 1
      },
      {
        id: "h10",
        prompt: text("Who discovered penicillin?", "Qui a découvert la pénicilline ?"),
        options: options(["Alexander Fleming", "Louis Pasteur", "Marie Curie", "Gregor Mendel"], ["Alexander Fleming", "Louis Pasteur", "Marie Curie", "Gregor Mendel"]),
        answer: 0
      },
      {
        id: "h11",
        prompt: text("The Titanic sank in which ocean?", "Le Titanic a coulé dans quel océan ?"),
        options: options(["Atlantic", "Pacific", "Indian", "Arctic"], ["Atlantique", "Pacifique", "Indien", "Arctique"]),
        answer: 0
      },
      {
        id: "h12",
        prompt: text("Who was the first woman to win a Nobel Prize?", "Qui fut la première femme à remporter un prix Nobel ?"),
        options: options(["Ada Lovelace", "Marie Curie", "Florence Nightingale", "Jane Goodall"], ["Ada Lovelace", "Marie Curie", "Florence Nightingale", "Jane Goodall"]),
        answer: 1
      },
      {
        id: "h13",
        prompt: text("Who is known as the Maid of Orleans?", "Qui est connue comme la Pucelle d'Orléans ?"),
        options: options(["Joan of Arc", "Catherine the Great", "Queen Victoria", "Eleanor of Aquitaine"], ["Jeanne d'Arc", "Catherine la Grande", "Reine Victoria", "Aliénor d'Aquitaine"]),
        answer: 0
      },
      {
        id: "h14",
        prompt: text("The Magna Carta was signed in which country?", "La Magna Carta a été signée dans quel pays ?"),
        options: options(["France", "England", "Spain", "Germany"], ["France", "Angleterre", "Espagne", "Allemagne"]),
        answer: 1
      },
      {
        id: "h15",
        prompt: text("Petra was built by which people?", "Pétra a été construite par quel peuple ?"),
        options: options(["Nabataeans", "Romans", "Assyrians", "Phoenicians"], ["Nabatéens", "Romains", "Assyriens", "Phéniciens"]),
        answer: 0
      },
      {
        id: "h16",
        prompt: text("Chichen Itza was built by which civilization?", "Chichén Itzá a été construit par quelle civilisation ?"),
        options: options(["Inca", "Maya", "Aztec", "Olmec"], ["Inca", "Maya", "Aztèque", "Olmèque"]),
        answer: 1
      },
      {
        id: "h17",
        prompt: text("Who painted the Mona Lisa?", "Qui a peint la Joconde ?"),
        options: options(["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"], ["Michel-Ange", "Léonard de Vinci", "Raphaël", "Donatello"]),
        answer: 1
      },
      {
        id: "h18",
        prompt: text("Which ancient civilization used cuneiform writing?", "Quelle civilisation ancienne utilisait l'écriture cunéiforme ?"),
        options: options(["Sumerians", "Romans", "Egyptians", "Greeks"], ["Sumériens", "Romains", "Égyptiens", "Grecs"]),
        answer: 0
      },
      {
        id: "h19",
        prompt: text("The Silk Road connected China with which region?", "La Route de la soie reliait la Chine à quelle région ?"),
        options: options(["Europe", "South America", "Australia", "Antarctica"], ["Europe", "Amérique du Sud", "Australie", "Antarctique"]),
        answer: 0
      },
      {
        id: "h20",
        prompt: text("Who was the first person to step on the Moon?", "Qui a été la première personne à marcher sur la Lune ?"),
        options: options(["Yuri Gagarin", "Buzz Aldrin", "Neil Armstrong", "Michael Collins"], ["Youri Gagarine", "Buzz Aldrin", "Neil Armstrong", "Michael Collins"]),
        answer: 2
      }
    ]
  },
  {
    id: "sports",
    categoryId: "sports",
    categoryLabel: "Sports & Games",
    title: "Sports & Games",
    subtitle: "20 competitive picks",
    rounds: 20,
    accent: "#EF476F",
    questions: [
      {
        id: "sp1",
        prompt: text("How many players are on the field for one soccer team?", "Combien de joueurs y a-t-il sur le terrain pour une équipe de football ?"),
        options: options(["9", "10", "11", "12"], ["9", "10", "11", "12"]),
        answer: 2
      },
      {
        id: "sp2",
        prompt: text("Which game is played on a board with 64 squares?", "Quel jeu se joue sur un plateau de 64 cases ?"),
        options: options(["Checkers", "Chess", "Go", "Backgammon"], ["Dames", "Échecs", "Go", "Backgammon"]),
        answer: 1
      },
      {
        id: "sp3",
        prompt: text("Wimbledon is a tournament for which sport?", "Wimbledon est un tournoi de quel sport ?"),
        options: options(["Golf", "Tennis", "Cricket", "Rugby"], ["Golf", "Tennis", "Cricket", "Rugby"]),
        answer: 1
      },
      {
        id: "sp4",
        prompt: text("How many points is a free throw worth in basketball?", "Combien de points vaut un lancer franc au basket ?"),
        options: options(["1", "2", "3", "4"], ["1", "2", "3", "4"]),
        answer: 0
      },
      {
        id: "sp5",
        prompt: text("Which sport uses a shuttlecock?", "Quel sport utilise un volant ?"),
        options: options(["Badminton", "Table tennis", "Tennis", "Squash"], ["Badminton", "Tennis de table", "Tennis", "Squash"]),
        answer: 0
      },
      {
        id: "sp6",
        prompt: text("In baseball, three strikes equals:", "Au baseball, trois prises valent :"),
        options: options(["A walk", "An out", "A run", "An error"], ["Une marche", "Un retrait", "Un point", "Une erreur"]),
        answer: 1
      },
      {
        id: "sp7",
        prompt: text(
          "The Olympic rings represent how many inhabited continents?",
          "Les anneaux olympiques représentent combien de continents habités ?"
        ),
        options: options(["4", "5", "6", "7"], ["4", "5", "6", "7"]),
        answer: 1
      },
      {
        id: "sp8",
        prompt: text("Which game uses a cue ball?", "Quel jeu utilise une bille blanche ?"),
        options: options(["Bowling", "Pool", "Croquet", "Darts"], ["Bowling", "Billard", "Croquet", "Fléchettes"]),
        answer: 1
      },
      {
        id: "sp9",
        prompt: text("Which sport includes a pommel horse?", "Quel sport inclut le cheval d'arçons ?"),
        options: options(["Gymnastics", "Equestrian", "Fencing", "Rowing"], ["Gymnastique", "Équitation", "Escrime", "Aviron"]),
        answer: 0
      },
      {
        id: "sp10",
        prompt: text("A touchdown is scored in which sport?", "Un touchdown est marqué dans quel sport ?"),
        options: options(["Soccer", "American football", "Rugby", "Hockey"], ["Football", "Football américain", "Rugby", "Hockey"]),
        answer: 1
      },
      {
        id: "sp11",
        prompt: text("In golf, one under par is called a:", "Au golf, un coup sous le par s'appelle :"),
        options: options(["Bogey", "Eagle", "Birdie", "Par"], ["Bogey", "Eagle", "Birdie", "Par"]),
        answer: 2
      },
      {
        id: "sp12",
        prompt: text("In bowling, knocking down all pins in one roll is a:", "Au bowling, faire tomber toutes les quilles en un lancer est un :"),
        options: options(["Spare", "Strike", "Split", "Frame"], ["Spare", "Strike", "Split", "Tour"]),
        answer: 1
      },
      {
        id: "sp13",
        prompt: text("The Tour de France is a competition in which sport?", "Le Tour de France est une compétition de quel sport ?"),
        options: options(["Running", "Cycling", "Skiing", "Swimming"], ["Course à pied", "Cyclisme", "Ski", "Natation"]),
        answer: 1
      },
      {
        id: "sp14",
        prompt: text("Which sport uses a bat and a wicket?", "Quel sport utilise une batte et un guichet ?"),
        options: options(["Baseball", "Cricket", "Softball", "Lacrosse"], ["Baseball", "Cricket", "Softball", "Lacrosse"]),
        answer: 1
      },
      {
        id: "sp15",
        prompt: text("Which sport is played with a puck?", "Quel sport se joue avec un palet ?"),
        options: options(["Field hockey", "Ice hockey", "Lacrosse", "Curling"], ["Hockey sur gazon", "Hockey sur glace", "Lacrosse", "Curling"]),
        answer: 1
      },
      {
        id: "sp16",
        prompt: text("How many innings are in a standard baseball game?", "Combien de manches y a-t-il dans un match de baseball standard ?"),
        options: options(["7", "8", "9", "10"], ["7", "8", "9", "10"]),
        answer: 2
      },
      {
        id: "sp17",
        prompt: text("Which board game features properties and rent?", "Quel jeu de société comporte des propriétés et des loyers ?"),
        options: options(["Risk", "Monopoly", "Clue", "Scrabble"], ["Risk", "Monopoly", "Cluedo", "Scrabble"]),
        answer: 1
      },
      {
        id: "sp18",
        prompt: text("How many points is a touchdown worth in American football?", "Combien de points vaut un touchdown en football américain ?"),
        options: options(["3", "6", "7", "8"], ["3", "6", "7", "8"]),
        answer: 1
      },
      {
        id: "sp19",
        prompt: text("In tennis, a score of zero is called:", "Au tennis, un score de zéro s'appelle :"),
        options: options(["Love", "Nil", "Zero", "Blank"], ["Love", "Nil", "Zéro", "Blanc"]),
        answer: 0
      },
      {
        id: "sp20",
        prompt: text("Which sport features a net and a spike?", "Quel sport comporte un filet et un smash ?"),
        options: options(["Volleyball", "Basketball", "Handball", "Water polo"], ["Volley-ball", "Basketball", "Handball", "Water-polo"]),
        answer: 0
      }
    ]
  },
  {
    id: "pop",
    categoryId: "pop",
    categoryLabel: "Pop Culture",
    title: "Pop Culture",
    subtitle: "20 media moments",
    rounds: 20,
    accent: "#FF9F1C",
    questions: [
      {
        id: "p1",
        prompt: text("Hogwarts is the school in which series?", "Hogwarts est l'école de quelle série ?"),
        options: options(["Harry Potter", "Percy Jackson", "The Chronicles of Narnia", "Twilight"], ["Harry Potter", "Percy Jackson", "Le Monde de Narnia", "Twilight"]),
        answer: 0
      },
      {
        id: "p2",
        prompt: text("Which movie features the line 'I'll be back'?", "Quel film contient la réplique 'I'll be back' ?"),
        options: options(["Terminator", "Rocky", "Die Hard", "Alien"], ["Terminator", "Rocky", "Die Hard", "Alien"]),
        answer: 0
      },
      {
        id: "p3",
        prompt: text("Who created Mickey Mouse?", "Qui a créé Mickey Mouse ?"),
        options: options(["Walt Disney", "Pixar", "Hanna-Barbera", "DreamWorks"], ["Walt Disney", "Pixar", "Hanna-Barbera", "DreamWorks"]),
        answer: 0
      },
      {
        id: "p4",
        prompt: text("Which band performed 'Hey Jude'?", "Quel groupe a interprété 'Hey Jude' ?"),
        options: options(["The Beatles", "The Rolling Stones", "Queen", "ABBA"], ["The Beatles", "The Rolling Stones", "Queen", "ABBA"]),
        answer: 0
      },
      {
        id: "p5",
        prompt: text("Who wrote 'The Hobbit'?", "Qui a écrit 'Le Hobbit' ?"),
        options: options(["J.R.R. Tolkien", "C.S. Lewis", "George R.R. Martin", "J.K. Rowling"], ["J.R.R. Tolkien", "C.S. Lewis", "George R.R. Martin", "J.K. Rowling"]),
        answer: 0
      },
      {
        id: "p6",
        prompt: text("'Thriller' is an album by which artist?", "'Thriller' est un album de quel artiste ?"),
        options: options(["Prince", "Michael Jackson", "Madonna", "Whitney Houston"], ["Prince", "Michael Jackson", "Madonna", "Whitney Houston"]),
        answer: 1
      },
      {
        id: "p7",
        prompt: text("Which superhero is known for a vibranium shield?", "Quel super-héros est connu pour son bouclier en vibranium ?"),
        options: options(["Batman", "Captain America", "Iron Man", "Thor"], ["Batman", "Captain America", "Iron Man", "Thor"]),
        answer: 1
      },
      {
        id: "p8",
        prompt: text("'To be or not to be' comes from which play?", "'Être ou ne pas être' vient de quelle pièce ?"),
        options: options(["Macbeth", "Hamlet", "Othello", "King Lear"], ["Macbeth", "Hamlet", "Othello", "Le Roi Lear"]),
        answer: 1
      },
      {
        id: "p9",
        prompt: text("Sherlock Holmes was created by which author?", "Sherlock Holmes a été créé par quel auteur ?"),
        options: options(["Agatha Christie", "Arthur Conan Doyle", "Edgar Allan Poe", "Jules Verne"], ["Agatha Christie", "Arthur Conan Doyle", "Edgar Allan Poe", "Jules Verne"]),
        answer: 1
      },
      {
        id: "p10",
        prompt: text("Which film features toys that come to life?", "Quel film met en scène des jouets qui prennent vie ?"),
        options: options(["Toy Story", "Cars", "Ratatouille", "Up"], ["Toy Story", "Cars", "Ratatouille", "Là-haut"]),
        answer: 0
      },
      {
        id: "p11",
        prompt: text("Who wrote the novel '1984'?", "Qui a écrit le roman '1984' ?"),
        options: options(["George Orwell", "Aldous Huxley", "Ray Bradbury", "Kurt Vonnegut"], ["George Orwell", "Aldous Huxley", "Ray Bradbury", "Kurt Vonnegut"]),
        answer: 0
      },
      {
        id: "p12",
        prompt: text("Which movie is about a ship that sinks after hitting an iceberg?", "Quel film parle d'un navire qui coule après avoir heurté un iceberg ?"),
        options: options(["Titanic", "Jaws", "The Perfect Storm", "Cast Away"], ["Titanic", "Les Dents de la mer", "En pleine tempête", "Seul au monde"]),
        answer: 0
      },
      {
        id: "p13",
        prompt: text("Which superhero comes from the planet Krypton?", "Quel super-héros vient de la planète Krypton ?"),
        options: options(["Superman", "Spider-Man", "Black Panther", "The Flash"], ["Superman", "Spider-Man", "Black Panther", "Flash"]),
        answer: 0
      },
      {
        id: "p14",
        prompt: text("'May the Force be with you' is from which series?", "'Que la Force soit avec toi' vient de quelle saga ?"),
        options: options(["Star Trek", "Star Wars", "Dune", "Avatar"], ["Star Trek", "Star Wars", "Dune", "Avatar"]),
        answer: 1
      },
      {
        id: "p15",
        prompt: text("Who painted 'The Starry Night'?", "Qui a peint 'La Nuit étoilée' ?"),
        options: options(["Vincent van Gogh", "Claude Monet", "Pablo Picasso", "Salvador Dali"], ["Vincent van Gogh", "Claude Monet", "Pablo Picasso", "Salvador Dali"]),
        answer: 0
      },
      {
        id: "p16",
        prompt: text("Link is the main character in which game series?", "Link est le personnage principal de quelle série de jeux ?"),
        options: options(["Final Fantasy", "The Legend of Zelda", "Pokemon", "Mario"], ["Final Fantasy", "The Legend of Zelda", "Pokémon", "Mario"]),
        answer: 1
      },
      {
        id: "p17",
        prompt: text("Which TV show is set in the fictional town of Springfield?", "Quelle série se déroule dans la ville fictive de Springfield ?"),
        options: options(["The Simpsons", "Friends", "Seinfeld", "The Office"], ["Les Simpson", "Friends", "Seinfeld", "The Office"]),
        answer: 0
      },
      {
        id: "p18",
        prompt: text("Katniss Everdeen is the hero of which book series?", "Katniss Everdeen est l'héroïne de quelle série de livres ?"),
        options: options(["Divergent", "The Hunger Games", "The Maze Runner", "Twilight"], ["Divergente", "Hunger Games", "Le Labyrinthe", "Twilight"]),
        answer: 1
      },
      {
        id: "p19",
        prompt: text("The One Ring appears in which series?", "L'Anneau unique apparaît dans quelle série ?"),
        options: options(["The Lord of the Rings", "Game of Thrones", "Harry Potter", "The Witcher"], ["Le Seigneur des anneaux", "Game of Thrones", "Harry Potter", "The Witcher"]),
        answer: 0
      },
      {
        id: "p20",
        prompt: text("Which animated film features a snowman named Olaf?", "Quel film d'animation met en scène un bonhomme de neige nommé Olaf ?"),
        options: options(["Frozen", "Moana", "Tangled", "Brave"], ["La Reine des neiges", "Vaiana", "Raiponce", "Rebelle"]),
        answer: 0
      }
    ]
  },
  {
    id: "nature",
    categoryId: "nature",
    categoryLabel: "Nature & Animals",
    title: "Nature & Animals",
    subtitle: "20 wild facts",
    rounds: 20,
    accent: "#27AE60",
    questions: [
      {
        id: "n1",
        prompt: text("What is the largest land animal?", "Quel est le plus grand animal terrestre ?"),
        options: options(["African elephant", "Rhinoceros", "Hippopotamus", "Giraffe"], ["Éléphant d'Afrique", "Rhinocéros", "Hippopotame", "Girafe"]),
        answer: 0
      },
      {
        id: "n2",
        prompt: text("What is the fastest land animal?", "Quel est l'animal terrestre le plus rapide ?"),
        options: options(["Cheetah", "Lion", "Pronghorn", "Leopard"], ["Guépard", "Lion", "Antilope d'Amérique", "Léopard"]),
        answer: 0
      },
      {
        id: "n3",
        prompt: text("Which mammal can truly fly?", "Quel mammifère peut vraiment voler ?"),
        options: options(["Bat", "Flying squirrel", "Ostrich", "Penguin"], ["Chauve-souris", "Écureuil volant", "Autruche", "Manchot"]),
        answer: 0
      },
      {
        id: "n4",
        prompt: text("Which animal is known for black and white stripes?", "Quel animal est connu pour ses rayures noires et blanches ?"),
        options: options(["Zebra", "Tiger", "Skunk", "Okapi"], ["Zèbre", "Tigre", "Moufette", "Okapi"]),
        answer: 0
      },
      {
        id: "n5",
        prompt: text("The change from caterpillar to butterfly is called:", "Le passage de la chenille au papillon s'appelle :"),
        options: options(["Germination", "Metamorphosis", "Pollination", "Evaporation"], ["Germination", "Métamorphose", "Pollinisation", "Évaporation"]),
        answer: 1
      },
      {
        id: "n6",
        prompt: text(
          "In popular culture, which animal is called the king of the jungle?",
          "Dans la culture populaire, quel animal est appelé le roi de la jungle ?"
        ),
        options: options(["Lion", "Tiger", "Elephant", "Gorilla"], ["Lion", "Tigre", "Éléphant", "Gorille"]),
        answer: 0
      },
      {
        id: "n7",
        prompt: text(
          "Which living bird is the tallest when standing?",
          "Quel oiseau vivant est le plus grand debout ?"
        ),
        options: options(["Ostrich", "Eagle", "Swan", "Albatross"], ["Autruche", "Aigle", "Cygne", "Albatros"]),
        answer: 0
      },
      {
        id: "n8",
        prompt: text("Penguins are birds that cannot:", "Les manchots sont des oiseaux qui ne peuvent pas :"),
        options: options(["Swim", "Fly", "Dive", "Walk"], ["Nager", "Voler", "Plonger", "Marcher"]),
        answer: 1
      },
      {
        id: "n9",
        prompt: text("A group of wolves is called a:", "Un groupe de loups s'appelle :"),
        options: options(["Herd", "Pack", "Pride", "Flock"], ["Troupeau", "Meute", "Harde", "Volée"]),
        answer: 1
      },
      {
        id: "n10",
        prompt: text("Which animal is famous for building dams?", "Quel animal est célèbre pour construire des barrages ?"),
        options: options(["Otter", "Beaver", "Muskrat", "Mink"], ["Loutre", "Castor", "Rat musqué", "Vison"]),
        answer: 1
      },
      {
        id: "n11",
        prompt: text("What is the largest shark?", "Quel est le plus grand requin ?"),
        options: options(["Great white", "Whale shark", "Hammerhead", "Tiger shark"], ["Grand blanc", "Requin-baleine", "Requin-marteau", "Requin-tigre"]),
        answer: 1
      },
      {
        id: "n12",
        prompt: text("Many bears spend winter in a state called:", "De nombreux ours passent l'hiver dans un état appelé :"),
        options: options(["Migration", "Hibernation", "Dormancy", "Estivation"], ["Migration", "Hibernation", "Dormance", "Estivation"]),
        answer: 1
      },
      {
        id: "n13",
        prompt: text("Which animal has the longest neck?", "Quel animal a le cou le plus long ?"),
        options: options(["Giraffe", "Camel", "Llama", "Moose"], ["Girafe", "Chameau", "Lama", "Orignal"]),
        answer: 0
      },
      {
        id: "n14",
        prompt: text(
          "What is a young frog (before metamorphosis) called?",
          "Comment s'appelle le jeune de la grenouille avant la métamorphose ?"
        ),
        options: options(["Calf", "Tadpole", "Cub", "Kid"], ["Veau", "Têtard", "Petit", "Chevreau"]),
        answer: 1
      },
      {
        id: "n15",
        prompt: text("Which mammal lays eggs?", "Quel mammifère pond des œufs ?"),
        options: options(["Kangaroo", "Platypus", "Koala", "Sloth"], ["Kangourou", "Ornithorynque", "Koala", "Paresseux"]),
        answer: 1
      },
      {
        id: "n16",
        prompt: text("What do koalas mainly eat?", "Que mangent principalement les koalas ?"),
        options: options(["Bamboo", "Eucalyptus leaves", "Grass", "Fruit"], ["Bambou", "Feuilles d'eucalyptus", "Herbe", "Fruits"]),
        answer: 1
      },
      {
        id: "n17",
        prompt: text("What is the largest rainforest on Earth?", "Quelle est la plus grande forêt tropicale du monde ?"),
        options: options(["Congo", "Amazon", "Daintree", "Sundarbans"], ["Congo", "Amazonie", "Daintree", "Sundarbans"]),
        answer: 1
      },
      {
        id: "n18",
        prompt: text("Which sea animal has eight arms?", "Quel animal marin a huit bras ?"),
        options: options(["Octopus", "Squid", "Starfish", "Jellyfish"], ["Poulpe", "Calmar", "Étoile de mer", "Méduse"]),
        answer: 0
      },
      {
        id: "n19",
        prompt: text("Which animal is known for changing colors?", "Quel animal est connu pour changer de couleur ?"),
        options: options(["Chameleon", "Frog", "Peacock", "Gecko"], ["Caméléon", "Grenouille", "Paon", "Gecko"]),
        answer: 0
      },
      {
        id: "n20",
        prompt: text(
          "What is another term for a turtle's shell?",
          "Quel est un autre terme pour la coque d'une tortue ?"
        ),
        options: options(["Shell", "Scale", "Hide", "Carapace"], ["Coquille", "Écaille", "Peau", "Carapace"]),
        answer: 3
      }
    ]
  }
];

const extraQuestionsByCategory = {
  general: [
    {
      id: "f41",
      prompt: text("What is the largest hot desert on Earth?", "Quel est le plus grand désert chaud de la Terre ?"),
      options: options(
        ["Sahara", "Gobi", "Kalahari", "Atacama"],
        ["Sahara", "Gobi", "Kalahari", "Atacama"]
      ),
      answer: 0
    },
    {
      id: "f42",
      prompt: text("Who is credited with inventing the telephone?", "À qui attribue-t-on l'invention du téléphone ?"),
      options: options(
        ["Alexander Graham Bell", "Thomas Edison", "Nikola Tesla", "James Watt"],
        ["Alexander Graham Bell", "Thomas Edison", "Nikola Tesla", "James Watt"]
      ),
      answer: 0
    },
    {
      id: "f43",
      prompt: text("What is the SI unit of electric current?", "Quelle est l'unité SI du courant électrique ?"),
      options: options(["Volt", "Watt", "Ampere", "Ohm"], ["Volt", "Watt", "Ampère", "Ohm"]),
      answer: 2
    },
    {
      id: "f44",
      prompt: text("What is the currency of Japan?", "Quelle est la monnaie du Japon ?"),
      options: options(["Won", "Yuan", "Yen", "Ringgit"], ["Won", "Yuan", "Yen", "Ringgit"]),
      answer: 2
    },
    {
      id: "f45",
      prompt: text("How many bones are in an adult human body?", "Combien d'os compte le corps humain adulte ?"),
      options: options(["196", "206", "216", "226"], ["196", "206", "216", "226"]),
      answer: 1
    },
    {
      id: "f46",
      prompt: text(
        "What is the largest moon in our solar system?",
        "Quelle est la plus grande lune de notre système solaire ?"
      ),
      options: options(["Titan", "Ganymede", "Europa", "Io"], ["Titan", "Ganymede", "Europe", "Io"]),
      answer: 1
    },
    {
      id: "f47",
      prompt: text("Who wrote 'Don Quixote'?", "Qui a écrit 'Don Quichotte' ?"),
      options: options(
        ["Miguel de Cervantes", "Victor Hugo", "Dante Alighieri", "Jules Verne"],
        ["Miguel de Cervantes", "Victor Hugo", "Dante Alighieri", "Jules Verne"]
      ),
      answer: 0
    },
    {
      id: "f48",
      prompt: text("How many sides does a heptagon have?", "Combien de côtés a un heptagone ?"),
      options: options(["6", "7", "8", "9"], ["6", "7", "8", "9"]),
      answer: 1
    },
    {
      id: "f49",
      prompt: text("What is the hardest substance in the human body?", "Quelle est la substance la plus dure du corps humain ?"),
      options: options(["Bone", "Cartilage", "Tooth enamel", "Nail"], ["Os", "Cartilage", "Émail dentaire", "Ongle"]),
      answer: 2
    },
    {
      id: "f50",
      prompt: text("What is the currency of the United Kingdom?", "Quelle est la monnaie du Royaume-Uni ?"),
      options: options(["Euro", "Pound sterling", "Dollar", "Franc"], ["Euro", "Livre sterling", "Dollar", "Franc"]),
      answer: 1
    },
    {
      id: "f51",
      prompt: text("What is the first element in the periodic table?", "Quel est le premier élément du tableau périodique ?"),
      options: options(["Helium", "Hydrogen", "Oxygen", "Carbon"], ["Hélium", "Hydrogène", "Oxygène", "Carbone"]),
      answer: 1
    },
    {
      id: "f52",
      prompt: text("Which ocean lies between Africa and Australia?", "Quel océan se situe entre l'Afrique et l'Australie ?"),
      options: options(["Atlantic Ocean", "Pacific Ocean", "Indian Ocean", "Arctic Ocean"], ["Océan Atlantique", "Océan Pacifique", "Océan Indien", "Océan Arctique"]),
      answer: 2
    },
    {
      id: "f53",
      prompt: text("Who wrote 'Les Miserables'?", "Qui a écrit 'Les Misérables' ?"),
      options: options(["Victor Hugo", "Emile Zola", "Alexandre Dumas", "Albert Camus"], ["Victor Hugo", "Émile Zola", "Alexandre Dumas", "Albert Camus"]),
      answer: 0
    },
    {
      id: "f54",
      prompt: text("Which vitamin is produced when skin is exposed to sunlight?", "Quelle vitamine est produite lorsque la peau est exposée au soleil ?"),
      options: options(["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin K"], ["Vitamine A", "Vitamine C", "Vitamine D", "Vitamine K"]),
      answer: 2
    },
    {
      id: "f55",
      prompt: text("Which instrument records earthquakes?", "Quel instrument enregistre les tremblements de terre ?"),
      options: options(["Barometer", "Seismograph", "Thermometer", "Altimeter"], ["Baromètre", "Sismographe", "Thermomètre", "Altimètre"]),
      answer: 1
    },
    {
      id: "f56",
      prompt: text("What is the capital of Australia?", "Quelle est la capitale de l'Australie ?"),
      options: options(["Sydney", "Melbourne", "Canberra", "Perth"], ["Sydney", "Melbourne", "Canberra", "Perth"]),
      answer: 2
    }
  ],
  logic: [
    {
      id: "l31",
      prompt: text("What comes next: 1, 8, 27, 64, ?", "Quelle est la suite : 1, 8, 27, 64, ?"),
      options: options(["81", "100", "125", "216"], ["81", "100", "125", "216"]),
      answer: 2
    },
    {
      id: "l32",
      prompt: text("Find the odd number out: 3, 5, 7, 9", "Trouvez l'intrus : 3, 5, 7, 9"),
      options: options(["3", "5", "7", "9"], ["3", "5", "7", "9"]),
      answer: 3
    },
    {
      id: "l33",
      prompt: text(
        "If all squares are rectangles, are all rectangles squares?",
        "Si tous les carrés sont des rectangles, tous les rectangles sont-ils des carrés ?"
      ),
      options: options(
        ["Yes", "No", "Only in geometry books", "Cannot tell"],
        ["Oui", "Non", "Seulement dans les livres de géométrie", "Impossible à dire"]
      ),
      answer: 1
    },
    {
      id: "l34",
      prompt: text("What is the angle of a clock at exactly 3:00?", "Quel est l'angle d'une horloge à 3 h 00 ?"),
      options: options(
        ["45 degrees", "60 degrees", "90 degrees", "120 degrees"],
        ["45 degrés", "60 degrés", "90 degrés", "120 degrés"]
      ),
      answer: 2
    },
    {
      id: "l35",
      prompt: text("What comes next: Z, X, V, T, ?", "Quelle est la suite : Z, X, V, T, ?"),
      options: options(["S", "R", "Q", "P"], ["S", "R", "Q", "P"]),
      answer: 1
    },
    {
      id: "l36",
      prompt: text("Which number is not prime?", "Quel nombre n'est pas premier ?"),
      options: options(["29", "31", "33", "37"], ["29", "31", "33", "37"]),
      answer: 2
    },
    {
      id: "l37",
      prompt: text(
        "If you overtake the runner in second place, what place are you in?",
        "Si tu dépasses le coureur en deuxième position, tu es à quelle place ?"
      ),
      options: options(
        ["First", "Second", "Third", "Fourth"],
        ["Première", "Deuxième", "Troisième", "Quatrième"]
      ),
      answer: 1
    },
    {
      id: "l38",
      prompt: text("What comes next: 2, 6, 12, 20, 30, ?", "Quelle est la suite : 2, 6, 12, 20, 30, ?"),
      options: options(["36", "40", "42", "48"], ["36", "40", "42", "48"]),
      answer: 2
    },
    {
      id: "l39",
      prompt: text("What comes next: 1, 2, 4, 7, 11, ?", "Quelle est la suite : 1, 2, 4, 7, 11, ?"),
      options: options(["14", "15", "16", "17"], ["14", "15", "16", "17"]),
      answer: 2
    },
    {
      id: "l40",
      prompt: text("Find the odd one out: 2, 3, 5, 9", "Trouvez l'intrus : 2, 3, 5, 9"),
      options: options(["2", "3", "5", "9"], ["2", "3", "5", "9"]),
      answer: 3
    },
    {
      id: "l41",
      prompt: text(
        "If all A are B and no B are C, can any A be C?",
        "Si tous les A sont des B et qu'aucun B n'est C, un A peut-il être C ?"
      ),
      options: options(["Yes", "No", "Only sometimes", "Cannot tell"], ["Oui", "Non", "Seulement parfois", "Impossible à dire"]),
      answer: 1
    },
    {
      id: "l42",
      prompt: text("What comes next: B, D, G, K, ?", "Quelle est la suite : B, D, G, K, ?"),
      options: options(["N", "O", "P", "Q"], ["N", "O", "P", "Q"]),
      answer: 2
    },
    {
      id: "l43",
      prompt: text("Find the missing number: 81, 27, 9, 3, ?", "Trouvez le nombre manquant : 81, 27, 9, 3, ?"),
      options: options(["0", "1", "2", "3"], ["0", "1", "2", "3"]),
      answer: 1
    },
    {
      id: "l44",
      prompt: text("If yesterday was Monday, what day is the day after tomorrow?", "Si hier était lundi, quel jour sera après-demain ?"),
      options: options(["Tuesday", "Wednesday", "Thursday", "Friday"], ["Mardi", "Mercredi", "Jeudi", "Vendredi"]),
      answer: 2
    },
    {
      id: "l45",
      prompt: text("How many degrees are in a straight angle?", "Combien de degrés y a-t-il dans un angle plat ?"),
      options: options(["90", "120", "180", "360"], ["90", "120", "180", "360"]),
      answer: 2
    },
    {
      id: "l46",
      prompt: text("What comes next: 7, 14, 28, 56, ?", "Quelle est la suite : 7, 14, 28, 56, ?"),
      options: options(["84", "98", "112", "120"], ["84", "98", "112", "120"]),
      answer: 2
    }
  ],
  science: [
    {
      id: "s21",
      prompt: text("What is the normal average human body temperature?", "Quelle est la température moyenne normale du corps humain ?"),
      options: options(["35 C", "36 C", "37 C", "38 C"], ["35 C", "36 C", "37 C", "38 C"]),
      answer: 2
    },
    {
      id: "s22",
      prompt: text("Which metal is strongly attracted to magnets?", "Quel métal est fortement attiré par les aimants ?"),
      options: options(["Iron", "Gold", "Silver", "Copper"], ["Fer", "Or", "Argent", "Cuivre"]),
      answer: 0
    },
    {
      id: "s23",
      prompt: text("What is the shape of a DNA molecule?", "Quelle est la forme d'une molécule d'ADN ?"),
      options: options(
        ["Single helix", "Double helix", "Triangle", "Cube"],
        ["Hélice simple", "Double hélice", "Triangle", "Cube"]
      ),
      answer: 1
    },
    {
      id: "s24",
      prompt: text(
        "What is the approximate speed of light in vacuum?",
        "Quelle est la vitesse approximative de la lumière dans le vide ?"
      ),
      options: options(
        ["30,000 km/s", "300,000 km/s", "3,000,000 km/s", "3,000 km/s"],
        ["30 000 km/s", "300 000 km/s", "3 000 000 km/s", "3 000 km/s"]
      ),
      answer: 1
    },
    {
      id: "s25",
      prompt: text("Which part of the Earth is at its center?", "Quelle partie de la Terre se trouve en son centre ?"),
      options: options(["Mantle", "Crust", "Core", "Lithosphere"], ["Manteau", "Croûte", "Noyau", "Lithosphère"]),
      answer: 2
    },
    {
      id: "s26",
      prompt: text("Which blood cells help fight infections?", "Quelles cellules sanguines aident à combattre les infections ?"),
      options: options(
        ["Red blood cells", "White blood cells", "Platelets", "Plasma"],
        ["Globules rouges", "Globules blancs", "Plaquettes", "Plasma"]
      ),
      answer: 1
    },
    {
      id: "s27",
      prompt: text("What is the largest part of the human brain?", "Quelle est la plus grande partie du cerveau humain ?"),
      options: options(["Cerebellum", "Cerebrum", "Brainstem", "Thalamus"], ["Cervelet", "Cerveau", "Tronc cérébral", "Thalamus"]),
      answer: 1
    },
    {
      id: "s28",
      prompt: text(
        "Which organelle contains chlorophyll in plant cells?",
        "Quel organite contient la chlorophylle dans les cellules végétales ?"
      ),
      options: options(
        ["Mitochondrion", "Nucleus", "Chloroplast", "Ribosome"],
        ["Mitochondrie", "Noyau", "Chloroplaste", "Ribosome"]
      ),
      answer: 2
    },
    {
      id: "s29",
      prompt: text("What molecule carries oxygen in human blood?", "Quelle molécule transporte l'oxygène dans le sang humain ?"),
      options: options(["Glucose", "Hemoglobin", "Insulin", "Collagen"], ["Glucose", "Hémoglobine", "Insuline", "Collagène"]),
      answer: 1
    },
    {
      id: "s30",
      prompt: text("What is the SI unit of force?", "Quelle est l'unité SI de la force ?"),
      options: options(["Joule", "Pascal", "Newton", "Watt"], ["Joule", "Pascal", "Newton", "Watt"]),
      answer: 2
    },
    {
      id: "s31",
      prompt: text("What is the pH of pure water at room temperature?", "Quel est le pH de l'eau pure à température ambiante ?"),
      options: options(["5", "6", "7", "8"], ["5", "6", "7", "8"]),
      answer: 2
    },
    {
      id: "s32",
      prompt: text(
        "What is the smallest unit of an element that keeps its chemical properties?",
        "Quelle est la plus petite unité d'un élément qui conserve ses propriétés chimiques ?"
      ),
      options: options(["Molecule", "Atom", "Cell", "Ion"], ["Molécule", "Atome", "Cellule", "Ion"]),
      answer: 1
    },
    {
      id: "s33",
      prompt: text("What is the process of liquid turning into gas called?", "Comment s'appelle le passage de l'état liquide à l'état gazeux ?"),
      options: options(["Condensation", "Fusion", "Evaporation", "Sublimation"], ["Condensation", "Fusion", "Évaporation", "Sublimation"]),
      answer: 2
    },
    {
      id: "s34",
      prompt: text("What is Earth's natural satellite?", "Quel est le satellite naturel de la Terre ?"),
      options: options(["Mars", "The Moon", "Venus", "Europa"], ["Mars", "La Lune", "Vénus", "Europe"]),
      answer: 1
    },
    {
      id: "s35",
      prompt: text("Which metal was traditionally used in thermometers?", "Quel métal était traditionnellement utilisé dans les thermomètres ?"),
      options: options(["Lead", "Mercury", "Aluminum", "Zinc"], ["Plomb", "Mercure", "Aluminium", "Zinc"]),
      answer: 1
    },
    {
      id: "s36",
      prompt: text("Which instrument measures electric current?", "Quel instrument mesure l'intensité du courant électrique ?"),
      options: options(["Voltmeter", "Ammeter", "Barometer", "Ohmmeter"], ["Voltmètre", "Ampèremètre", "Baromètre", "Ohmmètre"]),
      answer: 1
    }
  ],
  geography: [
    {
      id: "g21",
      prompt: text("What is the capital of Spain?", "Quelle est la capitale de l'Espagne ?"),
      options: options(["Barcelona", "Madrid", "Seville", "Valencia"], ["Barcelone", "Madrid", "Séville", "Valence"]),
      answer: 1
    },
    {
      id: "g22",
      prompt: text("What is the longest river in Africa?", "Quel est le plus long fleuve d'Afrique ?"),
      options: options(["Congo", "Niger", "Nile", "Zambezi"], ["Congo", "Niger", "Nil", "Zambèze"]),
      answer: 2
    },
    {
      id: "g23",
      prompt: text("Sydney is a major city in which country?", "Sydney est une grande ville de quel pays ?"),
      options: options(
        ["New Zealand", "Australia", "South Africa", "Canada"],
        ["Nouvelle-Zélande", "Australie", "Afrique du Sud", "Canada"]
      ),
      answer: 1
    },
    {
      id: "g24",
      prompt: text(
        "Which mountain range separates France and Spain?",
        "Quelle chaîne de montagnes sépare la France et l'Espagne ?"
      ),
      options: options(["Alps", "Apennines", "Pyrenees", "Carpathians"], ["Alpes", "Apennins", "Pyrénées", "Carpates"]),
      answer: 2
    },
    {
      id: "g25",
      prompt: text("What is the largest island in the world?", "Quelle est la plus grande île du monde ?"),
      options: options(
        ["Greenland", "Madagascar", "Borneo", "New Guinea"],
        ["Groenland", "Madagascar", "Bornéo", "Nouvelle-Guinée"]
      ),
      answer: 0
    },
    {
      id: "g26",
      prompt: text(
        "Which sea lies between Europe and Africa?",
        "Quelle mer se trouve entre l'Europe et l'Afrique ?"
      ),
      options: options(
        ["Baltic Sea", "Mediterranean Sea", "North Sea", "Black Sea"],
        ["Mer Baltique", "Mer Méditerranée", "Mer du Nord", "Mer Noire"]
      ),
      answer: 1
    },
    {
      id: "g27",
      prompt: text("What is the capital of Turkey?", "Quelle est la capitale de la Turquie ?"),
      options: options(["Istanbul", "Ankara", "Izmir", "Bursa"], ["Istanbul", "Ankara", "Izmir", "Bursa"]),
      answer: 1
    },
    {
      id: "g28",
      prompt: text("Which country is known as the Land of the Rising Sun?", "Quel pays est appelé le pays du Soleil levant ?"),
      options: options(["China", "South Korea", "Japan", "Thailand"], ["Chine", "Corée du Sud", "Japon", "Thaïlande"]),
      answer: 2
    },
    {
      id: "g29",
      prompt: text("What is the capital of Argentina?", "Quelle est la capitale de l'Argentine ?"),
      options: options(["Santiago", "Lima", "Buenos Aires", "Montevideo"], ["Santiago", "Lima", "Buenos Aires", "Montevideo"]),
      answer: 2
    },
    {
      id: "g30",
      prompt: text("Which river flows through London?", "Quel fleuve traverse Londres ?"),
      options: options(["Seine", "Thames", "Rhine", "Tiber"], ["Seine", "Tamise", "Rhin", "Tibre"]),
      answer: 1
    },
    {
      id: "g31",
      prompt: text("Nairobi is the capital of which country?", "Nairobi est la capitale de quel pays ?"),
      options: options(["Tanzania", "Kenya", "Uganda", "Ethiopia"], ["Tanzanie", "Kenya", "Ouganda", "Éthiopie"]),
      answer: 1
    },
    {
      id: "g32",
      prompt: text("Which is the largest country by area?", "Quel est le plus grand pays du monde par superficie ?"),
      options: options(["China", "Canada", "Russia", "United States"], ["Chine", "Canada", "Russie", "États-Unis"]),
      answer: 2
    },
    {
      id: "g33",
      prompt: text("What is the capital of Egypt?", "Quelle est la capitale de l'Égypte ?"),
      options: options(["Alexandria", "Cairo", "Giza", "Luxor"], ["Alexandrie", "Le Caire", "Gizeh", "Louxor"]),
      answer: 1
    },
    {
      id: "g34",
      prompt: text("Mount Kilimanjaro is located in which country?", "Le mont Kilimandjaro se trouve dans quel pays ?"),
      options: options(["Kenya", "Tanzania", "Ethiopia", "South Africa"], ["Kenya", "Tanzanie", "Éthiopie", "Afrique du Sud"]),
      answer: 1
    },
    {
      id: "g35",
      prompt: text("Which country has the longest coastline in the world?", "Quel pays possède le plus long littoral du monde ?"),
      options: options(["Australia", "Russia", "Canada", "Indonesia"], ["Australie", "Russie", "Canada", "Indonésie"]),
      answer: 2
    },
    {
      id: "g36",
      prompt: text("What is the name of the strait between Spain and Morocco?", "Quel est le nom du détroit entre l'Espagne et le Maroc ?"),
      options: options(
        ["Strait of Hormuz", "Bering Strait", "Strait of Gibraltar", "Bosporus"],
        ["Détroit d'Ormuz", "Détroit de Béring", "Détroit de Gibraltar", "Bosphore"]
      ),
      answer: 2
    }
  ],
  history: [
    {
      id: "h21",
      prompt: text("In which year did World War II end?", "En quelle année la Seconde Guerre mondiale s'est-elle terminée ?"),
      options: options(["1944", "1945", "1946", "1947"], ["1944", "1945", "1946", "1947"]),
      answer: 1
    },
    {
      id: "h22",
      prompt: text("Who was the first human in space?", "Qui a été le premier humain dans l'espace ?"),
      options: options(
        ["Yuri Gagarin", "Neil Armstrong", "John Glenn", "Valentina Tereshkova"],
        ["Youri Gagarine", "Neil Armstrong", "John Glenn", "Valentina Terechkova"]
      ),
      answer: 0
    },
    {
      id: "h23",
      prompt: text("In what year did the Berlin Wall fall?", "En quelle année le mur de Berlin est-il tombé ?"),
      options: options(["1987", "1988", "1989", "1991"], ["1987", "1988", "1989", "1991"]),
      answer: 2
    },
    {
      id: "h24",
      prompt: text("Who invented the movable-type printing press in Europe?", "Qui a inventé l'imprimerie à caractères mobiles en Europe ?"),
      options: options(
        ["Johannes Gutenberg", "Leonardo da Vinci", "Galileo Galilei", "Isaac Newton"],
        ["Johannes Gutenberg", "Léonard de Vinci", "Galilée", "Isaac Newton"]
      ),
      answer: 0
    },
    {
      id: "h25",
      prompt: text("In which year did the French Revolution begin?", "En quelle année la Révolution française a-t-elle commencé ?"),
      options: options(["1776", "1789", "1799", "1815"], ["1776", "1789", "1799", "1815"]),
      answer: 1
    },
    {
      id: "h26",
      prompt: text("In which year was the Magna Carta signed?", "En quelle année la Magna Carta a-t-elle été signée ?"),
      options: options(["1066", "1215", "1492", "1689"], ["1066", "1215", "1492", "1689"]),
      answer: 1
    },
    {
      id: "h27",
      prompt: text("Julius Caesar was a leader of which civilization?", "Jules César était un dirigeant de quelle civilisation ?"),
      options: options(["Greek", "Egyptian", "Roman", "Persian"], ["Grecque", "Égyptienne", "Romaine", "Perse"]),
      answer: 2
    },
    {
      id: "h28",
      prompt: text("In which country was the Rosetta Stone discovered?", "Dans quel pays la pierre de Rosette a-t-elle été découverte ?"),
      options: options(
        ["Egypt", "Greece", "Italy", "Turkey"],
        ["Égypte", "Grèce", "Italie", "Turquie"]
      ),
      answer: 0
    },
    {
      id: "h29",
      prompt: text("In which year did Christopher Columbus first reach the Americas?", "En quelle année Christophe Colomb a-t-il atteint les Amériques pour la première fois ?"),
      options: options(["1492", "1498", "1502", "1510"], ["1492", "1498", "1502", "1510"]),
      answer: 0
    },
    {
      id: "h30",
      prompt: text("Who was the first emperor of Rome?", "Qui fut le premier empereur de Rome ?"),
      options: options(["Julius Caesar", "Augustus", "Nero", "Trajan"], ["Jules César", "Auguste", "Néron", "Trajan"]),
      answer: 1
    },
    {
      id: "h31",
      prompt: text("Which war ended with the Treaty of Versailles?", "Quelle guerre s'est terminée avec le traité de Versailles ?"),
      options: options(["World War I", "World War II", "Franco-Prussian War", "Crimean War"], ["Première Guerre mondiale", "Seconde Guerre mondiale", "Guerre franco-prussienne", "Guerre de Crimée"]),
      answer: 0
    },
    {
      id: "h32",
      prompt: text("Which British prime minister was nicknamed the Iron Lady?", "Quelle Première ministre britannique était surnommée la Dame de fer ?"),
      options: options(["Theresa May", "Margaret Thatcher", "Indira Gandhi", "Angela Merkel"], ["Theresa May", "Margaret Thatcher", "Indira Gandhi", "Angela Merkel"]),
      answer: 1
    },
    {
      id: "h33",
      prompt: text("The ancient city of Troy is in which modern-day country?", "La cité antique de Troie se trouve dans quel pays actuel ?"),
      options: options(["Greece", "Turkey", "Italy", "Syria"], ["Grèce", "Turquie", "Italie", "Syrie"]),
      answer: 1
    },
    {
      id: "h34",
      prompt: text("In which year was the United Nations founded?", "En quelle année l'Organisation des Nations unies a-t-elle été fondée ?"),
      options: options(["1942", "1945", "1948", "1950"], ["1942", "1945", "1948", "1950"]),
      answer: 1
    },
    {
      id: "h35",
      prompt: text("Who developed the theory of relativity?", "Qui a développé la théorie de la relativité ?"),
      options: options(["Isaac Newton", "Albert Einstein", "Niels Bohr", "Max Planck"], ["Isaac Newton", "Albert Einstein", "Niels Bohr", "Max Planck"]),
      answer: 1
    },
    {
      id: "h36",
      prompt: text("Who became President of South Africa in 1994 after apartheid?", "Qui est devenu président de l'Afrique du Sud en 1994 après l'apartheid ?"),
      options: options(["Nelson Mandela", "Desmond Tutu", "F. W. de Klerk", "Thabo Mbeki"], ["Nelson Mandela", "Desmond Tutu", "F. W. de Klerk", "Thabo Mbeki"]),
      answer: 0
    }
  ],
  sports: [
    {
      id: "sp21",
      prompt: text("How many players per team are on the court in basketball?", "Combien de joueurs par équipe sont sur le terrain au basket ?"),
      options: options(["4", "5", "6", "7"], ["4", "5", "6", "7"]),
      answer: 1
    },
    {
      id: "sp22",
      prompt: text("A standard tennis set is usually won at how many games?", "Un set de tennis standard se gagne généralement à combien de jeux ?"),
      options: options(["4", "5", "6", "7"], ["4", "5", "6", "7"]),
      answer: 2
    },
    {
      id: "sp23",
      prompt: text("Which country hosted the 2016 Summer Olympics?", "Quel pays a accueilli les Jeux olympiques d'été 2016 ?"),
      options: options(["China", "United Kingdom", "Brazil", "Japan"], ["Chine", "Royaume-Uni", "Brésil", "Japon"]),
      answer: 2
    },
    {
      id: "sp24",
      prompt: text("Which chess piece moves in an L-shape?", "Quelle pièce d'échecs se déplace en L ?"),
      options: options(["Bishop", "Knight", "Rook", "Queen"], ["Fou", "Cavalier", "Tour", "Dame"]),
      answer: 1
    },
    {
      id: "sp25",
      prompt: text("In which sport do teams form a scrum?", "Dans quel sport les équipes forment-elles une mêlée ?"),
      options: options(["American football", "Rugby", "Handball", "Volleyball"], ["Football américain", "Rugby", "Handball", "Volley-ball"]),
      answer: 1
    },
    {
      id: "sp26",
      prompt: text("What is the official marathon distance?", "Quelle est la distance officielle du marathon ?"),
      options: options(["40.000 km", "41.195 km", "42.195 km", "43.000 km"], ["40,000 km", "41,195 km", "42,195 km", "43,000 km"]),
      answer: 2
    },
    {
      id: "sp27",
      prompt: text("How many events are in a decathlon?", "Combien d'épreuves composent un décathlon ?"),
      options: options(["8", "9", "10", "12"], ["8", "9", "10", "12"]),
      answer: 2
    },
    {
      id: "sp28",
      prompt: text("In baseball, how many feet is it from home plate to first base?", "Au baseball, quelle distance en pieds sépare le marbre de la première base ?"),
      options: options(["60", "70", "80", "90"], ["60", "70", "80", "90"]),
      answer: 3
    },
    {
      id: "sp29",
      prompt: text("How many players are on court for one volleyball team?", "Combien de joueurs sont sur le terrain pour une équipe de volley-ball ?"),
      options: options(["5", "6", "7", "8"], ["5", "6", "7", "8"]),
      answer: 1
    },
    {
      id: "sp30",
      prompt: text("Which Grand Slam tennis tournament is played on clay?", "Quel tournoi du Grand Chelem se joue sur terre battue ?"),
      options: options(["Wimbledon", "US Open", "Australian Open", "French Open"], ["Wimbledon", "US Open", "Open d'Australie", "Roland-Garros"]),
      answer: 3
    },
    {
      id: "sp31",
      prompt: text("In Formula 1, what does a checkered flag indicate?", "En Formule 1, que signifie un drapeau à damier ?"),
      options: options(["Rain", "Race finished", "Safety car", "Penalty"], ["Pluie", "Course terminée", "Voiture de sécurité", "Pénalité"]),
      answer: 1
    },
    {
      id: "sp32",
      prompt: text("Biathlon combines skiing with which other discipline?", "Le biathlon combine le ski avec quelle autre discipline ?"),
      options: options(["Fencing", "Shooting", "Cycling", "Skating"], ["Escrime", "Tir", "Cyclisme", "Patinage"]),
      answer: 1
    },
    {
      id: "sp33",
      prompt: text("In soccer, what usually happens when a player receives a red card?", "Au football, que se passe-t-il généralement lorsqu'un joueur reçoit un carton rouge ?"),
      options: options(["Nothing", "He gets a warning only", "He is sent off", "His team gets a penalty kick"], ["Rien", "Il reçoit seulement un avertissement", "Il est expulsé", "Son équipe obtient un penalty"]),
      answer: 2
    },
    {
      id: "sp34",
      prompt: text("In cricket, a score of 100 runs by one batter is called a:", "Au cricket, un score de 100 points par un batteur s'appelle :"),
      options: options(["Double", "Century", "Hat-trick", "Maiden"], ["Double", "Century", "Hat-trick", "Maiden"]),
      answer: 1
    },
    {
      id: "sp35",
      prompt: text("In chess, what is it called when the king is under immediate attack?", "Aux échecs, comment appelle-t-on la situation où le roi est attaqué immédiatement ?"),
      options: options(["Check", "Mate", "Stalemate", "Fork"], ["Échec", "Mat", "Pat", "Fourchette"]),
      answer: 0
    },
    {
      id: "sp36",
      prompt: text("In modern table tennis, a game is usually played to how many points?", "Au tennis de table moderne, une manche se joue généralement en combien de points ?"),
      options: options(["11", "15", "21", "25"], ["11", "15", "21", "25"]),
      answer: 0
    }
  ],
  pop: [
    {
      id: "p21",
      prompt: text("Who sings 'Like a Prayer'?", "Qui chante 'Like a Prayer' ?"),
      options: options(["Madonna", "Celine Dion", "Whitney Houston", "Cher"], ["Madonna", "Celine Dion", "Whitney Houston", "Cher"]),
      answer: 0
    },
    {
      id: "p22",
      prompt: text("What is the first name of Dr. Watson in Sherlock Holmes?", "Quel est le prénom du Dr Watson dans Sherlock Holmes ?"),
      options: options(["James", "John", "Jack", "Joseph"], ["James", "John", "Jack", "Joseph"]),
      answer: 1
    },
    {
      id: "p23",
      prompt: text("Which animated movie features Simba?", "Quel film d'animation met en scène Simba ?"),
      options: options(["The Lion King", "Bambi", "Tarzan", "Mowgli"], ["Le Roi lion", "Bambi", "Tarzan", "Mowgli"]),
      answer: 0
    },
    {
      id: "p24",
      prompt: text("Mario is the mascot of which video game company?", "Mario est la mascotte de quel éditeur de jeux vidéo ?"),
      options: options(["Sega", "Nintendo", "Sony", "Capcom"], ["Sega", "Nintendo", "Sony", "Capcom"]),
      answer: 1
    },
    {
      id: "p25",
      prompt: text("Darth Vader is a character from which saga?", "Dark Vador est un personnage de quelle saga ?"),
      options: options(["Star Wars", "Star Trek", "Dune", "Blade Runner"], ["Star Wars", "Star Trek", "Dune", "Blade Runner"]),
      answer: 0
    },
    {
      id: "p26",
      prompt: text("Who directed the movie 'Inception'?", "Qui a réalisé le film 'Inception' ?"),
      options: options(
        ["Christopher Nolan", "James Cameron", "Ridley Scott", "Denis Villeneuve"],
        ["Christopher Nolan", "James Cameron", "Ridley Scott", "Denis Villeneuve"]
      ),
      answer: 0
    },
    {
      id: "p27",
      prompt: text("Which band recorded 'Bohemian Rhapsody'?", "Quel groupe a enregistré 'Bohemian Rhapsody' ?"),
      options: options(["Queen", "The Beatles", "ABBA", "U2"], ["Queen", "The Beatles", "ABBA", "U2"]),
      answer: 0
    },
    {
      id: "p28",
      prompt: text("Who wrote 'Pride and Prejudice'?", "Qui a écrit 'Orgueil et Préjugés' ?"),
      options: options(
        ["Jane Austen", "Emily Bronte", "Virginia Woolf", "Mary Shelley"],
        ["Jane Austen", "Emily Bronte", "Virginia Woolf", "Mary Shelley"]
      ),
      answer: 0
    },
    {
      id: "p29",
      prompt: text("Who sings 'Shape of You'?", "Qui chante 'Shape of You' ?"),
      options: options(["Ed Sheeran", "Shawn Mendes", "Justin Bieber", "Harry Styles"], ["Ed Sheeran", "Shawn Mendes", "Justin Bieber", "Harry Styles"]),
      answer: 0
    },
    {
      id: "p30",
      prompt: text("Who created the 'Star Wars' saga?", "Qui a créé la saga 'Star Wars' ?"),
      options: options(["George Lucas", "Steven Spielberg", "James Cameron", "Peter Jackson"], ["George Lucas", "Steven Spielberg", "James Cameron", "Peter Jackson"]),
      answer: 0
    },
    {
      id: "p31",
      prompt: text("Captain Jack Sparrow appears in which film series?", "Le capitaine Jack Sparrow apparaît dans quelle série de films ?"),
      options: options(["The Mummy", "Pirates of the Caribbean", "Indiana Jones", "The Matrix"], ["La Momie", "Pirates des Caraïbes", "Indiana Jones", "Matrix"]),
      answer: 1
    },
    {
      id: "p32",
      prompt: text("Which group is known for the song 'Dancing Queen'?", "Quel groupe est connu pour la chanson 'Dancing Queen' ?"),
      options: options(["ABBA", "Bee Gees", "Queen", "Boney M."], ["ABBA", "Bee Gees", "Queen", "Boney M."]),
      answer: 0
    },
    {
      id: "p33",
      prompt: text("Which series features a character named Eleven?", "Quelle série met en scène un personnage nommé Eleven ?"),
      options: options(["Dark", "Stranger Things", "The Witcher", "Black Mirror"], ["Dark", "Stranger Things", "The Witcher", "Black Mirror"]),
      answer: 1
    },
    {
      id: "p34",
      prompt: text("PlayStation is a brand owned by which company?", "PlayStation est une marque appartenant à quelle entreprise ?"),
      options: options(["Nintendo", "Sega", "Sony", "Microsoft"], ["Nintendo", "Sega", "Sony", "Microsoft"]),
      answer: 2
    },
    {
      id: "p35",
      prompt: text("Which actor plays Tony Stark in the Marvel Cinematic Universe?", "Quel acteur joue Tony Stark dans l'univers cinématographique Marvel ?"),
      options: options(["Chris Evans", "Robert Downey Jr.", "Chris Hemsworth", "Mark Ruffalo"], ["Chris Evans", "Robert Downey Jr.", "Chris Hemsworth", "Mark Ruffalo"]),
      answer: 1
    },
    {
      id: "p36",
      prompt: text("Which animated movie is about emotions inside a young girl's mind?", "Quel film d'animation parle des émotions dans l'esprit d'une jeune fille ?"),
      options: options(["Coco", "Inside Out", "Soul", "Up"], ["Coco", "Vice-versa", "Soul", "Là-haut"]),
      answer: 1
    }
  ],
  nature: [
    {
      id: "n21",
      prompt: text("What is the largest animal in the ocean?", "Quel est le plus grand animal de l'océan ?"),
      options: options(
        ["Whale shark", "Blue whale", "Giant squid", "Orca"],
        ["Requin-baleine", "Baleine bleue", "Calmar géant", "Orque"]
      ),
      answer: 1
    },
    {
      id: "n22",
      prompt: text("Which process moves water through a plant and out of its leaves?", "Quel processus fait circuler l'eau dans la plante et la libère par les feuilles ?"),
      options: options(
        ["Respiration", "Photosynthesis", "Fermentation", "Transpiration"],
        ["Respiration", "Photosynthèse", "Fermentation", "Transpiration"]
      ),
      answer: 3
    },
    {
      id: "n23",
      prompt: text("Which bird is commonly used as a symbol of peace?", "Quel oiseau est couramment utilisé comme symbole de paix ?"),
      options: options(["Dove", "Eagle", "Sparrow", "Falcon"], ["Colombe", "Aigle", "Moineau", "Faucon"]),
      answer: 0
    },
    {
      id: "n24",
      prompt: text("Trees that lose their leaves every year are called:", "Les arbres qui perdent leurs feuilles chaque année sont dits :"),
      options: options(
        ["Evergreen", "Deciduous", "Coniferous", "Perennial"],
        ["Persistants", "Caducs", "Conifères", "Vivaces"]
      ),
      answer: 1
    },
    {
      id: "n25",
      prompt: text("Which animal has a trunk?", "Quel animal possède une trompe ?"),
      options: options(["Rhino", "Elephant", "Hippo", "Tapir"], ["Rhinocéros", "Éléphant", "Hippopotame", "Tapir"]),
      answer: 1
    },
    {
      id: "n26",
      prompt: text("What is a baby kangaroo called?", "Comment appelle-t-on un bébé kangourou ?"),
      options: options(["Cub", "Calf", "Joey", "Pup"], ["Petit", "Veau", "Joey", "Chiot"]),
      answer: 2
    },
    {
      id: "n27",
      prompt: text("What is the science of weather called?", "Comment s'appelle la science de la météo ?"),
      options: options(
        ["Geology", "Meteorology", "Ecology", "Oceanography"],
        ["Géologie", "Météorologie", "Écologie", "Océanographie"]
      ),
      answer: 1
    },
    {
      id: "n28",
      prompt: text("Coral reefs are built by tiny animals called:", "Les récifs coralliens sont construits par de minuscules animaux appelés :"),
      options: options(["Sponges", "Polyps", "Plankton", "Mollusks"], ["Éponges", "Polypes", "Plancton", "Mollusques"]),
      answer: 1
    },
    {
      id: "n29",
      prompt: text("What is the largest bear species?", "Quelle est la plus grande espèce d'ours ?"),
      options: options(["Brown bear", "Polar bear", "Black bear", "Panda"], ["Ours brun", "Ours polaire", "Ours noir", "Panda"]),
      answer: 1
    },
    {
      id: "n30",
      prompt: text("Which marine mammal is well known for echolocation?", "Quel mammifère marin est bien connu pour l'écholocation ?"),
      options: options(["Seal", "Dolphin", "Walrus", "Manatee"], ["Phoque", "Dauphin", "Morse", "Lamantin"]),
      answer: 1
    },
    {
      id: "n31",
      prompt: text("What do we call animals that are mainly active at night?", "Comment appelle-t-on les animaux principalement actifs la nuit ?"),
      options: options(["Diurnal", "Nocturnal", "Migratory", "Aquatic"], ["Diurnes", "Nocturnes", "Migrateurs", "Aquatiques"]),
      answer: 1
    },
    {
      id: "n32",
      prompt: text("Which tree produces acorns?", "Quel arbre produit des glands ?"),
      options: options(["Pine", "Birch", "Oak", "Maple"], ["Pin", "Bouleau", "Chêne", "Érable"]),
      answer: 2
    },
    {
      id: "n33",
      prompt: text("On which continent do penguins live in the wild?", "Sur quel continent les manchots vivent-ils à l'état sauvage ?"),
      options: options(["Europe", "South America", "Antarctica", "Asia"], ["Europe", "Amérique du Sud", "Antarctique", "Asie"]),
      answer: 2
    },
    {
      id: "n34",
      prompt: text("Which snake is the longest venomous snake in the world?", "Quel serpent est le plus long serpent venimeux du monde ?"),
      options: options(["Black mamba", "King cobra", "Rattlesnake", "Taipan"], ["Mamba noir", "Cobra royal", "Crotale", "Taïpan"]),
      answer: 1
    },
    {
      id: "n35",
      prompt: text("Which animal is commonly called the ship of the desert?", "Quel animal est couramment appelé le vaisseau du désert ?"),
      options: options(["Llama", "Camel", "Horse", "Donkey"], ["Lama", "Chameau", "Cheval", "Âne"]),
      answer: 1
    },
    {
      id: "n36",
      prompt: text("What do bees collect from flowers to make honey?", "Que récoltent les abeilles des fleurs pour fabriquer le miel ?"),
      options: options(["Pollen only", "Nectar", "Seeds", "Resin"], ["Uniquement du pollen", "Nectar", "Graines", "Résine"]),
      answer: 1
    }
  ]
};

const subtitleByCategory = {
  general: (count) => `${count} quick questions`,
  logic: (count) => `${count} logic challenges`,
  science: (count) => `${count} discoveries and facts`,
  geography: (count) => `${count} place-based picks`,
  history: (count) => `${count} moments from history`,
  sports: (count) => `${count} competitive picks`,
  pop: (count) => `${count} media moments`,
  nature: (count) => `${count} wild facts`
};

quizzes.forEach((quiz) => {
  const extraQuestions = extraQuestionsByCategory[quiz.categoryId] ?? [];
  if (extraQuestions.length > 0) {
    quiz.questions = [...quiz.questions, ...extraQuestions];
  }
  quiz.rounds = quiz.questions.length;
  const subtitleBuilder = subtitleByCategory[quiz.categoryId];
  if (subtitleBuilder) {
    quiz.subtitle = subtitleBuilder(quiz.rounds);
  }
});
