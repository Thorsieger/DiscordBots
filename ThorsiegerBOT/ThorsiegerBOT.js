//Library
const Discord = require("discord.js");
const ytdl = require("ytdl-core");
const ypi = require('youtube-playlist-info');
const search = require('youtube-search');
 
const client = new Discord.Client();
 
//Musique
const ServeurQueue = new Map();
var opts = {maxResults: 1,key: 'myKey'};
 
//Initialisation LeagueJS
process.env.LEAGUE_API_PLATFORM_ID = 'euw1';
const LeagueJs = require('leaguejs/lib/LeagueJS.js');
const api = new LeagueJs("myKey", {limits: {allowBursts: false}});
 
//Récupération des données statiques de l'api riot
var staticData;
var lolapiversion;
 
api.StaticData
.gettingChampions({dataById : true, tags : "all", locale : 'fr_FR'})
.then(info=>{
  staticData = info;
});
api.StaticData
.gettingVersions()
.then(data =>{
  lolapiversion=data[0];
});
 
client.on('message',message =>{
    var msg = message.content.split(" ");
    //Musique
        if(msg[0].toLowerCase()=='!musique')
    {
        if(!message.member.voice)return message.channel.send("Veuillez vous connecter à un channel vocal");
        if(msg[1]==undefined)return message.channel.send("Veuillez indiquer un URL youtube après cette commande");
        if(msg[1].startsWith("https://www.youtube.com/watch?v=")||msg[1].startsWith("www.youtube.com/watch?v=")||msg[1].startsWith("http://www.youtube.com/watch?v=")||msg[1].startsWith("https://youtu.be/"))
        {
            if(!ServeurQueue.has(message.guild.id))
            {
                message.member.voice.channel.join().then(connecti =>{
                    var CreateurServeurQueue ={
                        voiceChannel : message.member.voice.channel,
                        textChannel : message.channel,
                        connection : connecti,
                        Dispatcher : undefined,
                        queue : [msg[1]],
                        volume : 0.1
                    };
                    ServeurQueue.set(message.guild.id,CreateurServeurQueue);
                    lecture(message.guild.id);
                });  
            }else{
                ServeurQueue.get(message.guild.id).queue.push(msg[1]);
                message.channel.send(":white_check_mark: Musique placée en position " + ServeurQueue.get(message.guild.id).queue.length);
            }
        }else if(msg[1].startsWith("https://www.youtube.com/playlist?list=")||msg[1].startsWith("www.youtube.com/playlist?list=")||msg[1].startsWith("http://www.youtube.com/playlist?list=")){
            if(!ServeurQueue.has(message.guild.id))
            {
                message.member.voice.channel.join().then(connecti =>{
                    var CreateurServeurQueue ={
                        voiceChannel : message.member.voice.channel,
                        textChannel : message.channel,
                        connection : connecti,
                        Dispatcher : undefined,
                        queue : [],
                        volume : 0.1
                    };
                    ServeurQueue.set(message.guild.id,CreateurServeurQueue);
                    ypi("myKey", msg[1].split("playlist?list=")[1].toString()).then(items => {
                        for(var k =0; k<items.length;k++)
                        {
                            ServeurQueue.get(message.guild.id).queue.push("https://www.youtube.com/watch?v=" + items[k].resourceId.videoId);
                        }
                        message.channel.send(":white_check_mark: " +items.length + " musiques ajoutés");
                        lecture(message.guild.id);
                    }).catch(err =>{
                        message.channel.send(":x: " + err);
                        ConnectionInfo.connection.disconnect();
                        ServeurQueue.delete(guildID);
                    });
                     
                });  
            }else{
                ypi("myKey", msg[1].split("playlist?list=")[1].toString()).then(items => {
                    for(var k =0; k<items.length;k++)
                    {
                        ServeurQueue.get(message.guild.id).queue.push("https://www.youtube.com/watch?v=" + items[k].resourceId.videoId);
                    }
                    message.channel.send(":white_check_mark: " +items.length + " musiques ajoutés");
                }).catch(err =>{
                    message.channel.send(":x: " + err);
                });
            }
        }else{
            msg.shift();
            search(msg.join(' '), opts, function(err, results) {
            if(err) return message.channel.send(err);
            if(results[0].kind!="youtube#video") return message.channel.send(":x: Pas de vidéo correspondante");
            message.channel.send(new Discord.MessageEmbed()
                .setThumbnail("http://logok.org/wp-content/uploads/2014/08/Youtube-logo-2017.png")
                .setColor([255,0,0])
                .setTitle(":mag_right:  Résultat : "+ results[0].title)
                .addField("From : " + results[0].channelTitle,results[0].link + "\n\n**Voulez vous ecouter cette musique ?** [O]/[N] (10s)")
                .setImage(results[0].thumbnails.medium.url)
            ).then(()=>{
                message.channel.awaitMessages(response => response.author.id== message.author.id,{
                    max: 1,
                    time: 10000,
                  }).then(collected=>{
                    if(collected.first()==undefined)return message.channel.send(`:x: Vous avez attendu trop longtemps pour répondre ! ${message.author}`);
                    collected.first().delete(500);
                    if(!collected.first().content.toLocaleLowerCase()=="o")return undefined;
                    if(!ServeurQueue.has(message.guild.id))
                    {
                        message.member.voice.channel.join().then(connecti =>{
                            var CreateurServeurQueue ={
                                voiceChannel : message.member.voice.channel,
                                textChannel : message.channel,
                                connection : connecti,
                                Dispatcher : undefined,
                                queue : [results[0].link],
                                volume : 0.1
                            };
                            ServeurQueue.set(message.guild.id,CreateurServeurQueue);
                            lecture(message.guild.id);
                        });  
                    }else{
                        ServeurQueue.get(message.guild.id).queue.push(results[0].link);
                        message.channel.send(":white_check_mark: Musique placée en position " + ServeurQueue.get(message.guild.id).queue.length);
                    }                   
                  });
                 });
            });
        }
    }
    else if(msg[0].toLowerCase()=='!stop')
    {
        if(ServeurQueue.has(message.guild.id))
        {
            ServeurQueue.get(message.guild.id).queue = [];
            ServeurQueue.get(message.guild.id).connection.disconnect();
            ServeurQueue.get(message.guild.id).voiceChannel.leave();
        }
        else
        {
            message.channel.send("Le bot n'est pas en train de jouer de la musique");
        }
    }
    else if(msg[0].toLowerCase()=='!skip')
    {
        if(ServeurQueue.has(message.guild.id))
        {
            if(ServeurQueue.get(message.guild.id).queue.length!=0)
            {
                ServeurQueue.get(message.guild.id).Dispatcher.end();
            }
            else
            {
                message.channel.send("Il n'y a pas de musique à passer");
            }
        }
        else
        {
            message.channel.send("Le bot n'est pas en train de jouer de la musique");
        }
    }
    else if(msg[0].toLowerCase()=='!volume')
    {
        if(ServeurQueue.has(message.guild.id))
        {
            if(!msg[1]|| isNaN(msg[1]))return message.channel.send("Volume actuel : " + (ServeurQueue.get(message.guild.id).volume)*1000 + " %\nCompletez la commande avec une valeur numérique pour changer le volume global");
            ServeurQueue.get(message.guild.id).volume = msg[1]/1000;
            ServeurQueue.get(message.guild.id).Dispatcher.setVolume(msg[1]/1000);
            message.channel.send("Volume réglé à " + msg[1] + " %");
        }
        else
        {
            message.channel.send("Le bot n'est pas en train de jouer de la musique");
        }
    }
    //League of Legends
    else if(msg[0].toLowerCase()==`!profil`)
    {
    api.Summoner
    .gettingByName(msg[1])
    .then(data => {
      api.League
      .gettingPositionsForSummonerId(data.id)
      .then(info => {
        var messageEmbed = new Discord.MessageEmbed()
        .setThumbnail(`http://ddragon.leagueoflegends.com/cdn/${lolapiversion}/img/profileicon/${data.profileIconId}.png`)
        .setColor([0,0,255])
        .setTitle(`:trophy:  Profil de ${data.name} :trophy:`)
        .addField(`Niveau du compte :`,`${data.summonerLevel}`);
        if(info.length==0){
          messageEmbed.addField(`:triangular_flag_on_post: Classement :triangular_flag_on_post:`,`Unranked`);
        }else{
          for(j=0;j<info.length;j++){
            var type="";
            if(info[j].queueType=="RANKED_FLEX_SR"){
              type="ranked flex";
            }
            else if(info[j].queueType=="RANKED_SOLO_5x5"){
              type="ranked solo";
            }
            else if(info[j].queueType=="RANKED_FLEX_TT"){
              type="ranked flex 3v3";
            }
            var ligue=`${info[j].tier} ${info[j].rank} (${info[j].leaguePoints} lp)`
            if(info[j].leaguePoints == "100"){ligue += " | BO" + (info[j].miniSeries.target+1) + ` : ${info[j].miniSeries.wins}/${info[j].miniSeries.losses}`;}
            ligue += `\n${info[j].wins} wins/${info[j].losses} losses\n`;
            if(info[j].hotStreak){ligue+=":fire: Série de victoire "}
            if(info[j].veteran){ligue+=":medal: Vétéran "}
            if(info[j].freshBlood){ligue+=":small_blue_diamond: Recru"}
            messageEmbed.addField(":triangular_flag_on_post: Classement "+ type + " :triangular_flag_on_post:",ligue);
          }
        }
          message.channel.send(messageEmbed);
      });    
    })
    .catch(err => {
      message.channel.send(":x: Ce joueur n'existe pas (le speudo ne doit pas contenir d'espace) " + message.author);
    });
  }
  else if(msg[0].toLowerCase()==`!free`)
  {
    api.Champion
    .gettingList({freeToPlay: true})
    .then(data => {
          var champFree = [];
          for(j=0;j<data.champions.length;j++){
            var test = staticData.data[data.champions[j].id];
            if(test){
              champFree.push(" " + test.name);              
            }
          }
          message.channel.send(new Discord.MessageEmbed()
          .setColor([0,0,255])
          .setThumbnail(`http://ddragon.leagueoflegends.com/cdn/${lolapiversion}/img/profileicon/785.png`)
          .addField("Champions gratuit de la semaine !",champFree.join(","))        
         
        );
    });
  }
  else if(msg[0].toLowerCase()==`!champion`)
  {
    if(msg[2]!=undefined){msg[1]=msg[1]+" "+msg[2];}
      var champ;
      Object.keys(staticData.data).forEach((value)=>{
        if(staticData.data[value].name.toLowerCase() == msg[1].toLowerCase())
        {
          champ = staticData.data[value];
        } 
      });
      if(champ==undefined){return message.channel.send(":x: Ce personnage n'existe pas " + message.author);}
      var messageEmbed = new Discord.MessageEmbed()
      .setThumbnail(`http://ddragon.leagueoflegends.com/cdn/${lolapiversion}/img/champion/${champ.image.full}`)
      .setColor([0,0,255])
      .setTitle(`Information sur ${champ.name}`)
      .setDescription(`${champ.title}`)
      .addField("Histoire :",champ.blurb)
      .addField("Rôles principaux :",champ.tags)
      .addField("Sorts :","__Passive :__ " + champ.passive.name +"\n__A :__ " + champ.spells[0].name + "\n__Z :__ " +champ.spells[1].name+ "\n__E :__ " +champ.spells[2].name+ "\n__Ultime :__ " +champ.spells[3].name)
      .addField("Comment le jouer :",champ.allytips)
      .addField("Comment jouer contre :",champ.enemytips)
      .addField("Plus d'info ?",`[Lien leagueoflegends.com](https://euw.leagueoflegends.com/fr/game-info/champions/${champ.key}/)`);
      return message.channel.send(messageEmbed);
    }
    else if(msg[0].toLowerCase()=='!help')
    {
        message.channel.send(new Discord.MessageEmbed()
            .setThumbnail("https://cdn.pixabay.com/photo/2016/10/18/18/19/question-mark-1750942_960_720.png")
            .setColor([255,255,255])
            .setTitle(":mega: Aide à l'utilisation des commandes :mega:")
            .addField("__Vocal :__",`• !musique : Jouer de la musique à partir d'une url/playlist youtube \n\tou du titre recherché\n• !skip : Passer à la piste suivant\n• !stop : Arrêter la lecture des musiques\n• !volume : Permet de régler le volume général en pourcentage`)
            .addField("__League of Legends :__","• !free : Affiche la liste des champions gratuit de la semaine\n• !profil <speudo> : Affiche le profil League of Legends\n• !champion <nom du champion> : Affiche les infos sur le champion")
            .addField("__Info :__ ",`Créateur : <@142719043663691776> | Version : 4.2.1`)
        );
    }else if(msg[0].toLowerCase()=='!restart' && message.author.id ==142719043663691776){
process.exit();
}
});
 
function lecture(guildID)
{
    const ConnectionInfo = ServeurQueue.get(guildID);
    const lien = ConnectionInfo.queue[0].toString();
    try{
        const stream = ytdl(lien, {filter : "audioonly"});
        const dispatcher = ConnectionInfo.connection.play(stream);
        ConnectionInfo.Dispatcher = dispatcher;
        dispatcher.setVolume(ServeurQueue.get(guildID).volume)
            dispatcher.on("end",()=>{
                ConnectionInfo.queue.shift();
                if(ConnectionInfo.queue.length!=0)
                {
                    lecture(guildID);
                }
                else
                {
                    ConnectionInfo.connection.disconnect();
                 ServeurQueue.delete(guildID);
                }
            });
            dispatcher.on("error",(err)=>{ConnectionInfo.textChannel.send("Erreur : "+err);});
    }catch(error){
        ConnectionInfo.textChannel.send(":x: "+error);
        ConnectionInfo.connection.disconnect();
        ServeurQueue.delete(guildID);
    }
}
 
client.on('ready', ()=>{
    client.user.setPresence({status : "online",activity : {name : "!help", type : "LISTENING"} });
  });
 
client.login("myToken");
