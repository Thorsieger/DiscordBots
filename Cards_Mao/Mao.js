const { decks } = require('cards');
const Discord = require("discord.js");

var deck = new decks.StandardDeck();

const client = new Discord.Client();

var joueurs = [];
var MainsJoueurs = [];
var defausse = [];
var meneur = "";
var carteDessus;

client.on('message', (msg)=>{
    if(msg.content == "!create" && meneur=="")
    {
        deck = new decks.StandardDeck();
        deck.shuffleAll();
        MainsJoueurs = [];
        defausse = [];
        meneur = msg.author;
        joueurs = [meneur];
        msg.channel.send("Partie créé !");
    }
    else if(msg.content == "!join" && msg.author!="")
    {
        if(joueurs.indexOf(msg.author)>=0)return msg.channel.send("Vous etes déja dans la partie !");
        if(joueurs.length<7)
        {
            joueurs.push(msg.author);
            msg.channel.send("Nouveau joueur ! ( "+ joueurs.length +" )");
        }
        else
        {
            msg.channel.send("La partie est pleine !");
        }
    }
    else if(msg.content == "!start" && msg.author!="" && msg.author == meneur)
    {
        //if(joueurs.length==1)return msg.channel.send("Vous ne pouvez jouer seul!");
        //donne les mains aux joueurs
        for(var j=0;j<joueurs.length;j++){
            MainsJoueurs[j] = deck.draw(7);
            var main = "----------------------------\nNouvelle partie !";
            for(var i=0;i<MainsJoueurs[j].length;i++){
                main = main + " | " + MainsJoueurs[j][i].toString();
            }
            joueurs[j].send(main);
        }
        msg.channel.send("La partie commence !");
        carteDessus = deck.draw();

        msg.channel.send("Première carte : " + carteDessus.toString());
        deck.discard(carteDessus);
    }
    else if(msg.content.startsWith("!play"))
    {

        //changer valeur carte du dessus
        var cartePlayed = msg.content.split(" ");
        cartePlayed.shift()
        cartePlayed = cartePlayed.join('');//récupération carte en entier
        var pos;
        var J;
        joueurs.forEach(function(element,id){
            if(element == msg.author)
            {
                J = id;
            }
        });
        if(J== undefined)return msg.channel.send("Vous ne jouez pas!");
        MainsJoueurs[J].forEach(function(element,id){
            if(element.toString()==cartePlayed)
            {
                pos = id
            }
        });
        if(pos== undefined)return msg.channel.send("Vous n'avez pas cette carte en main!");
        carteDessus = MainsJoueurs[J].splice(pos,1);
        deck.discard(carteDessus[0]);
        var main = "Nouvelle main";
            for(var i=0;i<MainsJoueurs[J].length;i++){
                main = main + " | " + MainsJoueurs[J][i].toString();
            }
        joueurs[J].send(main);
        msg.channel.send(joueurs[J].username + " a " + MainsJoueurs[J].length + " cartes en main");
        //retirer la carte de la main du joueur
        //Affiche le nombre de carte du joueur
    }
    else if(msg.content.startsWith("!plus") && msg.author!="" && msg.author == meneur)
    {
        if(deck.remainingLength()==0)
        {
            if(deck.discardLenth()==1)return msg.channel.send("Il n'y a plus de carte dans la pioche");
            deck.remove(carteDessus[0]);
            deck.shuffleDeckAndDiscard();//faire on peut pas piocher la dernièr ecarte
            deck.add(carteDessus[0],'discard');
        }
            var usernameJoueur = msg.content.split(" ")[1];
            var J;
            joueurs.forEach(function(element,id){
                if(element.username == usernameJoueur)
                {
                    J = id;
                }
            });
            if(J== undefined)return msg.channel.send("Ce joueur n'existe pas!");
            MainsJoueurs[J].push(deck.draw());
            var main = "Nouvelle main";
            for(var i=0;i<MainsJoueurs[J].length;i++){
                main = main + " | " + MainsJoueurs[J][i].toString();
            }
            joueurs[J].send(main);
            msg.channel.send(joueurs[J].username + " a " + MainsJoueurs[J].length + " cartes en main");
    }
    else if(msg.content == "!end"&& msg.author!="" && msg.author == meneur)
    {
        meneur = "";
        //fin du jeu
    }
    else if(msg.content == "!help")
    {
        //affiche la liste des commandes disponibles
        msg.channel.send("Commandes disponibles : [!create] [!join] [!play] [!plus] [!end]");
    }
  });

client.login("myToken");
