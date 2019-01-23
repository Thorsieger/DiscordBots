//Discord
const Discord = require('discord.js');
const client = new Discord.Client();
const {prefix, token, lolapikey} = require('./BotConfig.json');
 
//Lecture de fichier
const fs = require('fs');
var iconv = require('iconv-lite');
 
//Variables du serveur
const {TempParentID, ChannelTextBot, ChannelVocalPermanent,everyone,BotRole,ModoRole} = require('./ServeurConfig.json');
var Pchannel = new Map();//Salon temporaire
var SMchannel = new Map();//Salon en slowmode
 
//Initialisation LeagueJS
process.env.LEAGUE_API_PLATFORM_ID = 'euw1';
const LeagueJs = require('leaguejs/lib/LeagueJS.js');
const api = new LeagueJs(lolapikey, {limits: {allowBursts: false}});
 
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
 
client.on('message', message => {
  if(!message.guild)return undefined;
  if(message.author.bot)return undefined;
  //slowmode
  if(SMchannel.has(message.channel.id))
  {
    if(!message.member.hasPermission("MANAGE_MESSAGES"))
    {
      var lastMessage = message.channel.messages.filter(val =>(val.author.id==message.author.id&&val!=message)).last();
      if((message.createdTimestamp-lastMessage.createdTimestamp)<(SMchannel.get(message.channel.id)*1000))
      {
        return message.delete();
      }
    }
  }
  var m = message.content.split(" ");
  //Commandes accessibles dans tous les salons
  if(m[0].toLowerCase()==`${prefix}slowmode`){
    if(!message.member.hasPermission("MANAGE_MESSAGES"))return undefined;
    if(isNaN(m[1]))return message.channel.send(":x: Erreur la valeur entrée n'est pas un nombre " + message.author);
    if(m[1]==0)
    {
      message.channel.send("Slowmode supprimé dans ce salon");
      SMchannel.delete(message.channel.id);
    }
    else
    {
      message.channel.send(`Slowmode activé (${m[1]}s)`);
      SMchannel.set(message.channel.id,m[1]);
    }
  }
  if(message.channel.id!=ChannelTextBot)return undefined;
  //Commandes accessibles seulement dans le salon spécifié
  if(m[0].toLowerCase()==`${prefix}help`)
  {
    message.channel.send(new Discord.MessageEmbed()
      .setThumbnail("https://cdn.pixabay.com/photo/2016/10/18/18/19/question-mark-1750942_960_720.png")
      .setColor([255,255,255])
      .setTitle(":mega: Aide à l'utilisation des commandes :mega:")
      .addField("__Vocal :__",`• !channel : Permet de créer son propre salon vocal\n• !goto : Permet de rejoindre un salon vocal avec mot de passe`)
      .addField("__League of Legends :__","• !free : Affiche la liste des champions gratuit de la semaine\n• !profil <speudo> : Affiche le profil League of Legends\n• !champion <nom du champion> : Affiche les infos sur le champion")
      .addField("__Info :__ ",`Créateur : <@142719043663691776> | Version : 1.0.0`)
    );
  }
  else if(m[0].toLowerCase()==`${prefix}profil`)
  {
    api.Summoner
    .gettingByName(m[1])
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
  else if(m[0].toLowerCase()==`${prefix}free`)
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
  else if(m[0].toLowerCase()==`${prefix}champion`)
  {
    if(m[2]!=undefined){m[1]=m[1]+" "+m[2];}
      var champ;
      Object.keys(staticData.data).forEach((value)=>{
        if(staticData.data[value].name.toLowerCase() == m[1].toLowerCase())
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
  else if(m[0].toLowerCase() === `${prefix}goto`)
  {
    if(!message.member.voiceChannel)return message.channel.send(":x: Vous devez etre connecté à un channel vocal "+ message.author);
    if(Pchannel.size==0)return message.author.send(":x: Il n'y a pas de salon temporaire !");
    var ChannelMdp=0;
    var env = "";
    Pchannel.forEach((value,key,map)=>{
      if(value.password!=undefined)
      {
        if(ChannelMdp==0){
          env = "Salon nécessitant un mot de passe :\n";
          ChannelMdp=1;
        }
        env = env + "**" + value.name.toString() + "**" ;
      }
    });
    if(ChannelMdp==0)return message.author.send(":x: Il n'y a pas de salon nécessitant un mot de passe");
    message.author.send(env + "\n\nQuel est celui que vous voulez rejoindre ? (entrer son nom)").then(()=>{
      message.author.dmChannel.awaitMessages(response => response.author.id==message.author.id,{
        max: 1,
        time: 10000,
      }).then(collected=>{
        if(collected.first()==undefined)return message.author.send(":x: Vous avez attendu trop longtemps pour répondre !");
        Pchannel.forEach((value,key,map)=>{
          if(value.name==collected.first().content){
            var cle = key;
            message.author.send(":white_check_mark: Quel est son mot de passe ?").then((cle)=>{
              message.author.dmChannel.awaitMessages(response => response.author.id==message.author.id,{
                max: 1,
                time: 10000,
              }).then(collected=>{
              if(collected.first()==undefined)return message.author.send(":x: Vous avez attendu trop longtemps pour répondre !");
              if(Pchannel.get(key).password==collected.first().content)
              {
                Pchannel.get(key).VC.guild.member(message.author).setVoiceChannel(Pchannel.get(key).VC);
                message.author.send(":white_check_mark: Mot de passe correct");
              }
              else{
                message.author.send(":x: Erreur de mot de passe");
              }
            });
          });
        }
        else{
          message.channel.send(":x: Il n'existe pas de salon ayant ce nom.");
        }
      });
    });
    });
  }
  else if (m[0].toLowerCase() === `${prefix}channel`)
  {
   message.channel.send(new Discord.MessageEmbed()
      .setThumbnail("http://www.acurata.de/fileadmin/Template/Images/Icons/contact-telephone.png")
      .setColor([255,0,0])
      .setTitle(":mega: **Création d'un salon vocal temporaire** :mega:")
      .setDescription("Aide à la création d'un salon vocal temporaire")
      .addField(":speech_left: __Informations :__",`:warning: Vous devez être déja **connecté à un salon vocal !**\n:wrench: Si un salon est vide il sera supprimé **immédiatement**\n:information_source: Vous ne pouvez avoir **qu'un seul** salon à la fois`)
      .addField(":speech_left: __Commandes :__",":white_check_mark: Créer le salon vocal\n:x: Supprimer le salon vocal\n:abc: Changer le nom du salon\n:closed_lock_with_key: Ajouter un code d'accés\n:slot_machine: Définir un nombre de place\n:outbox_tray: Kick des personnes de votre salon")
      .addField(":speech_left: __Mot de passe :__",`Pour rejoindre un salon avec un mot de passe, utiliser la commande !goto\n\nMessage adressé à ${message.author}`)
    ).then(message =>{
     message.react('✅').then(msg =>{//créer un channel :white_check_mark:
       msg.message.react('❌').then(msg =>{//supprimer le channel :x:
         msg.message.react('🔤').then(msg =>{//Changer le nom du salon :abc:
           msg.message.react('🔐').then(msg =>{//Ajouter un code :closed_lock_with_key:
             msg.message.react('🎰').then(msg =>{//mettre une limite :slot_machine:
               msg.message.react('📤')})})})})});//kick une personne :outbox_tray:
   });
  }
  else if(m[0].toLowerCase() === `${prefix}restart` && message.author.id=="142719043663691776")
  {
    process.exit();
  }
});
 
client.on('messageReactionAdd',(messageReaction,user) =>{
  if(user.bot)return undefined;
  var msg = messageReaction.message;
  if(!msg.author.bot)return undefined;
  messageReaction.remove(user.id);
  if(msg.embeds[0].title==":mega: **Création d'un salon vocal temporaire** :mega:")
  {
  if(messageReaction.emoji.name=="✅")
  {
    if(user.lastMessage.member==null)return msg.channel.send(":x: Erreur ! Veuillez retaper la commande " +user);
    if(!user.lastMessage.member.voiceChannel)return msg.channel.send(":x: Veuillez vous connecter à un salon vocal ! " +user);
    if(Pchannel.has(user.id))return msg.channel.send(":x: Vous avez déja un salon ! " + user);
      var channelCreate = {
        creator: user.username,
        name: user.tag,
        VC: undefined,
        TC: msg.channel,
        password: undefined,
        limit: 0,
      };
    msg.guild.createChannel(channelCreate.name,{type :'voice',parent:TempParentID,overwrites :[{allow : ['CONNECT','MANAGE_CHANNELS'],id:ModoRole},{allow : ['CONNECT'],id:BotRole},{allow : ['CONNECT'],id:user.id},{allow : ['CONNECT'],id:everyone}]}).then(VoiceChannel =>{
      channelCreate.VC=VoiceChannel;
      Pchannel.set(user.id,channelCreate);
      user.lastMessage.member.setVoiceChannel(VoiceChannel);
      return msg.channel.send(":white_check_mark: Salon créé ! " + user);
    });
  }
  else if(messageReaction.emoji.name=="❌")
  {
    if(!Pchannel.has(user.id))return msg.channel.send(":x: Vous n'avez pas de channel ! "+ user);
    Pchannel.get(user.id).VC.delete();
    Pchannel.delete(user.id);
    msg.channel.send(":white_check_mark: Channel supprimé ! " + user);
  }
  else if(messageReaction.emoji.name=="🔤")
  {
    if(!Pchannel.has(user.id))return msg.channel.send(":x: Vous n'avez pas de channel ! "+ user);
    msg.channel.send(":white_check_mark: Entrez le nouveau nom de votre salon (entre 2 et 20 caractères) " + user).then(()=>{
      msg.channel.awaitMessages(response => response.author.id==user.id,{
        max: 1,
        time: 10000,
      }).then(collected=>{
        if(collected.first()==undefined)return msg.channel.send(":x: Vous avez attendu trop longtemps pour répondre ! " + user);
        var newName = collected.first().content;
        if(newName.length<2 || newName.length>20)return msg.channel.send(":x: Veuillez recommencer : le nom du salon doit faire entre 2 et 20 caractères " + user);
        Pchannel.get(user.id).name=newName;
        Pchannel.get(user.id).VC.setName(newName);
      });
    });
  }
  else if(messageReaction.emoji.name=="🎰")
  {
    if(!Pchannel.has(user.id))return msg.channel.send(":x: Vous n'avez pas de channel ! "+ user);
    msg.channel.send(":white_check_mark: Entrez le nombre de place (entre 0=infini et 99) " + user).then(()=>{
      msg.channel.awaitMessages(response => response.author.id==user.id,{
        max: 1,
        time: 10000,
      }).then(collected=>{
        if(collected.first()==undefined)return msg.channel.send(":x: Vous avez attendu trop longtemps pour répondre ! " + user);
        var newLimit = collected.first().content;
        if(isNaN(newLimit))return msg.channel.send(":x: Veuillez recommencer : le nombre de place doit etre **un nombre** entre 0 et 99 " + user);
        if(newLimit<0 || newLimit>99)return msg.channel.send(":x: Veuillez recommencer : le nombre de place doit etre 0 et 99 " + user);
        Pchannel.get(user.id).setUserLimit=newLimit;
        return Pchannel.get(user.id).VC.setUserLimit(newLimit);
      });
    });
 
  }
  else if(messageReaction.emoji.name=="🔐")
  {
    if(!Pchannel.has(user.id))return msg.channel.send(":x: Vous n'avez pas de channel ! "+ user);
    if(Pchannel.get(user.id).password!=undefined)
    {
      Pchannel.get(user.id).password=undefined;
      Pchannel.get(user.id).VC.overwritePermissions(everyone,{'CONNECT':true});
      msg.channel.send(":white_check_mark: Le mot de passe à été supprimé " + user);
    }
    else
    {
    user.createDM().then(dmChannel => {
      dmChannel.send("Entrez mot de passe (entre 1 et 10 caractéres)").then(()=>{
        dmChannel.awaitMessages(response => response.author.id==user.id,{
          max: 1,
          time: 10000,
        }).then(collected=>{
        if(collected.first()==undefined)return dmChannel.send(":x: Vous avez attendu trop longtemps pour répondre !");
        var newMdp = collected.first().content;
        if(newMdp.length<0 || newMdp.length>10)return dmChannel.send(":x: Veuillez recommencer : le mot de passe doit faire entre 1 et 10 caractéres");
        Pchannel.get(user.id).password=newMdp;
        Pchannel.get(user.id).VC.overwritePermissions(everyone,{'CONNECT':false});
        return dmChannel.send(":white_check_mark: Mot de passe enregistré, pour rejoindre vous devrez utiliser la commande !goto");
        });
      });
    });
  }
  }
  else if(messageReaction.emoji.name=="📤")
  {
    if(!Pchannel.has(user.id))return msg.channel.send(":x: Vous n'avez pas de channel ! "+ user);
    var envoyer = "";  
    Pchannel.get(user.id).VC.members.array().forEach((element)=>{
      if(element.user.username!=Pchannel.get(user.id).creator)
      {
        envoyer = envoyer + "**" + element.user.username + "**" ;
      }
    });
    if(envoyer=="")return msg.channel.send(":x: Vous n'avez personne à kick personne dans votre salon " + user);
    msg.channel.send(":information_source: " + " Entrer le speudo de celui que vous voulez kick : \n"+ envoyer + "\n" + user).then(()=>{
      msg.channel.awaitMessages(response => response.author.id==user.id,{
        max: 1,
        time: 10000,
      }).then(collected=>{
        if(collected.first()==undefined)return msg.channel.send(":x: Vous avez attendu trop longtemps pour répondre ! "+ user);
        var Jkick = 0;
        Pchannel.get(user.id).VC.members.array().forEach((element)=>{
          if(element.user.username!=Pchannel.get(user.id).creator)
          {
            if(element.user.username == collected.first().content){
              Jkick=1;
              element.setVoiceChannel(ChannelVocalPermanent);
              return msg.channel.send(":white_check_mark: " +collected.first().content + " a bien été kick" + user)
            }
          }
      });
      if(Jkick==0){
        return msg.channel.send(":x: Cette personne n'est pas connecté à votre salon " +user);
      }
     });
    });
  }
}
});
 
client.on('voiceStateUpdate', (oldMember, newMember) => {
  if (oldMember.voiceChannel == newMember.voiceChannel) return undefined;
  if ((oldMember.voiceChannel.parentID==TempParentID) && !oldMember.voiceChannel.members.first()){
    if (oldMember.voiceChannel.id == ChannelVocalPermanent) return undefined;
    Pchannel.forEach((value,key,map)=>{
      if(value.VC==oldMember.voiceChannel)
      {
        value.TC.send(":white_check_mark:  Channel supprimé !");
        Pchannel.delete(key);
      }
    });
    oldMember.voiceChannel.delete();
  }
});
 
client.on('ready', ()=>{
  client.user.setPresence({status : "online",activity : {name : "!help dans #bot", type : "LISTENING"} });
});
 
client.on('guildMemberAdd', member=>{
  data = fs.readFile(__dirname + '/Citations_LoL.txt',function(err,data){
    citation = iconv.decode(data,'ISO-8859-1').split('\r');
    member.guild.channels.find("name", "general").send(new Discord.MessageEmbed()
    .setColor([255,255,255])
    .addField("Nouveau membre :",citation[Math.round(Math.random()*(citation.length-1))] +`<@${member.user.id}>`+`\n\nMerci de lire les régles dans ${member.guild.channels.find("name", "reglement")}`));
  });
});
 
client.login(token);
 
process.on("unhandledRejection", err => {
    console.log("unhandledRejection " +err);
});
