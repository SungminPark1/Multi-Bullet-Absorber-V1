"use strict";

(function(){
	var socket;
	var canvas;
	var ctx;

	var user = {};
	var highScore, currentScore;

	var room, started, isLobby;
	var players = {};
	var attackCircles = [];
	var enemy = {};
	var arrayBullets = [];
	var time;

	var damage = false;
	var updated = false;
	var viewControls = true;
	var previousSkillButtonDown = false;

	function init() {
		socket = io.connect();
		canvas = document.querySelector('canvas');
		ctx = canvas.getContext('2d');

		isLobby = true;
		started = false;

		// make attack circles
		for(var i = 0; i < 3; i++){
			var temp = {
				pos: {
					x: 320,
					y: 320
				},
				velocity: getRandomUnitVector(),
				radius: 40
			}
			attackCircles.push(temp);
		}

		setupUI();
		setupSocket();
		draw();
	}

	function setupUI(){
		user.name = document.querySelector('#user').innerHTML.substring(9);
		if(user.name == ''){
			user.name = "Guest " + Math.floor(Math.random()*1000);
		}
		else{
			document.querySelector('#highScore').innerHTML = highScore;
			document.querySelector('#currentScore').innerHTML = currentScore;
			document.querySelector('#score').value = highScore;
		}

		document.querySelector('#createRoom').onclick = function(e){
			//current code for test
			document.querySelector('#gameInfoBox').style.zIndex = 1;

			var divString = '<h1>Enter Room Name</h1>';
			divString += '<input id="roomName" type="text" placeholder="Room Name"></input>';
			divString += '<button id="submitCreateRoom">Create Room</button>';
			divString += '<button id="back">Back</button>';
			document.querySelector('#gameInfoBox').innerHTML = divString;


			//back to menu
			document.querySelector('#back').onclick = function(e){
				document.querySelector('#gameInfoBox').style.zIndex = -1;
			};

			// create the room
			document.querySelector('#submitCreateRoom').onclick = function(e){
				var roomName = document.querySelector('#roomName').value;
				if(roomName != ''){
					socket.emit('createRoom', {
						room: roomName,
						player: {
							name: user.name,
						}
					});
				}
				document.querySelector('#gameInfoBox').style.zIndex = -1;
			};			
		};

		document.querySelector('#joinRoom').onclick = function(e){
			document.querySelector('#gameInfoBox').style.zIndex = 1;

			var divString = '<h1>Enter Room Name</h1>';
			divString += '<input id="roomName" type="text" placeholder="Room Name"></input>';
			divString += '<button id="submitJoinRoom">Join Room</button>';
			divString += '<button id="back">Back</button>';
			document.querySelector('#gameInfoBox').innerHTML = divString;

			//back to menu
			document.querySelector('#back').onclick = function(e){
				document.querySelector('#gameInfoBox').style.zIndex = -1;
			};

			// create the room
			document.querySelector('#submitJoinRoom').onclick = function(e){
				var roomName = document.querySelector('#roomName').value;
				if(roomName != ''){
					var pos = {
						x: Math.random()*600+20,
						y: Math.random()*600+20,
					};

					var color = {
						r: 255,
						g: 0,
						b: 0
					};

					user.pos = pos;
					user.color = color;

					
					socket.emit('joinRoom', {
						room: roomName,
						player: {
							name: user.name,
						}
					});
				}
				document.querySelector('#gameInfoBox').style.zIndex = -1;
			};	
		};

		highScore = 0;
		currentScore = 0;
	}

	// sets up the socket
	function setupSocket(){
		socket.emit('join', {
			name: user.name
		});

		// updates player movements & bullets
		socket.on('update', function(data){
			players = data.players;
			arrayBullets = data.arrayBullets;
			enemy = {
				hp: data.enemyHp,
				maxHp: data.enemyMaxHp,
				damage: data.enemyDamage,
				name: data.enemyName
			};
			update();
		});

		// update data when players join game room
		socket.on('updateData', function(data){
			room = data.room;
			players = data.players;
			enemy = data.enemy;
			arrayBullets = arrayBullets;
			started = data.started;
			isLobby = false;
			var keys = Object.keys(players);
			for(var i = 0; i < keys.length; i++){
				if(keys[i] == user.name)user = players[keys[i]];
			}
			time = new Date().getTime();
			draw();
		});
	}

	// update
	function update(){
		if(started === false){
			var keys = Object.keys(players);
			// Find the clients username and update only his data
			for(var i = 0; i < keys.length; i++){
				if(keys[i] == user.name){
					var now = new Date().getTime(),
					//in seconds
					dt = (now - time)/1000;

					time = now;

					var player = players[keys[i]];

					updated = false;
					damage = 0;

					if(myKeys.keydown[myKeys.KEYBOARD.KEY_W] === true){
						if(myKeys.keydown[myKeys.KEYBOARD.KEY_SHIFT] === true) user.pos.y += (-player.speed/2) * dt;
						else user.pos.y += -player.speed * dt;
						updated = true;
					}
					if(myKeys.keydown[myKeys.KEYBOARD.KEY_A] === true){
						if(myKeys.keydown[myKeys.KEYBOARD.KEY_SHIFT] === true) user.pos.x += (-player.speed/2) * dt;
						else user.pos.x += -player.speed * dt;
						updated = true;
					}
					if(myKeys.keydown[myKeys.KEYBOARD.KEY_S] === true){
						if(myKeys.keydown[myKeys.KEYBOARD.KEY_SHIFT] === true) user.pos.y += (player.speed/2) * dt;
						else user.pos.y += player.speed * dt;
						updated = true;
					}
					if(myKeys.keydown[myKeys.KEYBOARD.KEY_D] === true){
						if(myKeys.keydown[myKeys.KEYBOARD.KEY_SHIFT] === true) user.pos.x += (player.speed/2) * dt;
						else user.pos.x += player.speed * dt;
						updated = true;
					}

					// players can only use skills when alive

					if(player.alive === true && previousSkillButtonDown === false){
						if(myKeys.keydown[myKeys.KEYBOARD.KEY_J] === true){
							previousSkillButtonDown = true;

							if(player.currentAttackRate == 0){
								for(var i = 0; i<attackCircles.length; i++){
									var distance = circlesIntersect(user.pos, attackCircles[i].pos);
									if( distance < player.hitbox + attackCircles[i].radius){
										attackCircles[i].velocity = getRandomUnitVector();
										// calculate damage
										var accuracy = 1 - distance / (player.hitbox + attackCircles[i].radius);
										damage += Math.max(player.maxDamage * accuracy, player.minDamage);
									}
								}
							}
							updated = true;
						}

						if(myKeys.keydown[myKeys.KEYBOARD.KEY_K] === true){
							previousSkillButtonDown = true;

							if(player.skill1Used === false){
								player.skill1Used = true;
							}
							else{
								player.skill1Used = false;
							}

							updated = true;
						}

						if(myKeys.keydown[myKeys.KEYBOARD.KEY_L] === true){
							previousSkillButtonDown = true;

							if(player.skill2Used === false){
								player.skill2Used = true;
							}
							else{
								player.skill2Used = false;
							}

							updated = true;
						}
					}

					// prevent player from going out of bound
					user.pos.x = clamp(user.pos.x, player.hitbox, 640 - player.hitbox);
					user.pos.y = clamp(user.pos.y, player.hitbox, 510 - player.hitbox);

					for(var i = 0; i < attackCircles.length; i++){
						attackCircles[i].pos.x += attackCircles[i].velocity.x * 2;
						attackCircles[i].pos.y += attackCircles[i].velocity.y * 2;
						
						if(attackCircles[i].pos.x < 30){
							attackCircles[i].velocity.x *= -1;
							attackCircles[i].pos.x += attackCircles[i].velocity.x * 2;
						}
						if(attackCircles[i].pos.x > 610){
							attackCircles[i].velocity.x *= -1;
							attackCircles[i].pos.x += attackCircles[i].velocity.x * 2;
						}
						if(attackCircles[i].pos.y < 30){
							attackCircles[i].velocity.y *= -1;
							attackCircles[i].pos.y += attackCircles[i].velocity.y * 2;
						}
						if(attackCircles[i].pos.y > 480){
							attackCircles[i].velocity.y *= -1;
							attackCircles[i].pos.y += attackCircles[i].velocity.y * 2;
						}
						
					}

					// if this client's user moves, send to server to update other clients
					if(updated === true){
						socket.emit('updatePlayer', {
							name: player.name,
							pos: user.pos,
							damage: damage,
							skill1Used: player.skill1Used,
							skill2Used: player.skill2Used
						});
					}

					if(myKeys.keydown[myKeys.KEYBOARD.KEY_C] === true && previousSkillButtonDown === false){
						previousSkillButtonDown = true;

						if(viewControls) viewControls = false;
						else viewControls = true;

					}

					if(myKeys.keydown[myKeys.KEYBOARD.KEY_J] || myKeys.keydown[myKeys.KEYBOARD.KEY_K] || myKeys.keydown[myKeys.KEYBOARD.KEY_L] || myKeys.keydown[myKeys.KEYBOARD.KEY_C]){
						previousSkillButtonDown = true;
					}
					else{ 
						previousSkillButtonDown = false;
					}

					draw(dt);
					return;
				}
			}
		}
	}

	// draw other client's object
	function draw(dt){
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		if(isLobby === true){
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			fillText(ctx, "Title", 640/2, 640/2 - 200, "50pt courier", "#ddd");

			fillText(ctx, "Control", 640/2, 640 - 130, "20pt courier", "#ddd");
			fillText(ctx, "Create a new room or join an existing room", 640/2, 640 - 100, "15pt courier", "#ddd");
			fillText(ctx, "Use cursor to click buttons", 640/2, 640 - 75, "15pt courier", "#ddd");
			//fillText(ctx, "Use cursor to click buttons", 640/2, 640 - 50, "15pt courier", "#ddd");
			//fillText(ctx, "Z or J to comfirm", 640/2, 640 - 75, "15pt courier", "#ddd");
			//fillText(ctx, "Shift or L to slow movement speed", 640/2, 640 - 50, "15pt courier", "#ddd");

		}
		else{
			if(started === true){
				var keys = Object.keys(players);

				for(var i = 0; i < keys.length; i++){
					var drawCall = players[ keys[i] ];
					if(drawCall.hit > 0){
						ctx.fillStyle = "rgb(" + (255 - drawCall.color.r) + ", " + (255 -drawCall.color.g) + ", " + (255 -drawCall.color.b) + ")";
					}	
					else{		
						ctx.fillStyle = "rgb(" + drawCall.color.r + ", " + drawCall.color.g + ", " + drawCall.color.b + ")";
					}
					ctx.beginPath();
					ctx.arc(drawCall.pos.x, drawCall.pos.y, drawCall.radius, 0, Math.PI * 2, false);
					ctx.fill();
					ctx.stroke();
					ctx.closePath();
					if(drawCall.name == user.name){
						currentScore = drawCall.score;
						if(highScore < currentScore){
							highScore = currentScore;
						}
						document.querySelector('#highScore').innerHTML = 'High Score: ' + highScore;
						document.querySelector('#currentScore').innerHTML = 'Current Score: ' + currentScore;
						document.querySelector('#score').value = highScore;
					}
				}

				for(var i = 0; i<arrayBullets.length; i++){
					ctx.fillStyle = 'white';
					ctx.beginPath();
					ctx.arc(arrayBullets[i].pos.x, arrayBullets[i].pos.y, arrayBullets[i].radius, 0, Math.PI*2, false);
					ctx.fill();
					ctx.closePath();
				}
			}
			else{
				var keys = Object.keys(players);

				// Enemy Draw
				ctx.fillStyle = "purple";
				ctx.fillRect(300,50,40,40);

				ctx.textAlign = "left";
				fillText(ctx, enemy.name , 525, 25, "15pt courier", "#ddd");
				fillText(ctx, 'damage: ' + enemy.damage.toFixed(2) , 525, 45, "10pt courier", "#ddd");

				// bullet array draw
				for(var i = 0; i<arrayBullets.length; i++){
					if(arrayBullets[i].absorbed == false) ctx.fillStyle = "white";
					else ctx.fillStyle = "gray";

					ctx.beginPath();
					ctx.arc(arrayBullets[i].pos.x, arrayBullets[i].pos.y, arrayBullets[i].radius, 0, Math.PI * 2, false);
					ctx.fill();
					ctx.closePath();
				}

				// draw players
				for(var i = 0; i < keys.length; i++){
					var drawCall = players[ keys[i] ];

					if(drawCall.alive === true){
						if(drawCall.name == user.name){
							// Attack Circle Draw
							for(var j = 0; j < attackCircles.length; j++){
								if(drawCall.currentAttackRate == 0){
									ctx.textAlign = "center";
									ctx.textBaseline = "middle";
									fillText(ctx, "ATTACK!", attackCircles[j].pos.x, attackCircles[j].pos.y, "10pt courier", "#fff");
									ctx.fillStyle = 'rgba(' + user.color.r + ',' + user.color.g + ',' + user.color.b + ', .5)' ;
									ctx.beginPath();
									ctx.arc(attackCircles[j].pos.x, attackCircles[j].pos.y, attackCircles[j].radius, 0, Math.PI * 2, false);
									ctx.fill();
									ctx.closePath();
								}
								else{
									ctx.fillStyle = 'rgba(' + user.color.r + ',' + user.color.g + ',' + user.color.b + ', .2)' ;
									ctx.beginPath();
									ctx.arc(attackCircles[j].pos.x, attackCircles[j].pos.y, attackCircles[j].radius, 0, Math.PI * 2, false);
									ctx.fill();
									ctx.closePath();
								}
							}
						}

						ctx.lineWidth= 2;
						// graze radius
						ctx.strokeStyle = 'white';
						ctx.beginPath();
						ctx.arc(drawCall.pos.x, drawCall.pos.y, drawCall.hitbox + drawCall.grazeRadius, 0, Math.PI * 2, false);
						ctx.stroke();
						ctx.closePath();

						// hp bar
						ctx.strokeStyle = 'rgb(255,0,0)';
						ctx.beginPath();
						ctx.arc(drawCall.pos.x, drawCall.pos.y, drawCall.hitbox + drawCall.grazeRadius, Math.PI/2, Math.PI * (drawCall.hp / drawCall.maxHp) + Math.PI/2, false);
						ctx.stroke();
						ctx.closePath();

						// energy bar
						ctx.strokeStyle = 'rgb(0,0,255)';
						ctx.beginPath();
						ctx.arc(drawCall.pos.x, drawCall.pos.y, drawCall.hitbox + drawCall.grazeRadius, Math.PI/2, -Math.PI * (drawCall.energy / drawCall.maxEnergy) +  Math.PI/2, true);
						ctx.stroke();
						ctx.closePath();
					}

					// exp bar
					ctx.strokeStyle = 'rgb(255,255,0)';
					ctx.beginPath();
					ctx.arc(drawCall.pos.x, drawCall.pos.y, drawCall.hitbox+1, Math.PI/2, Math.PI * (drawCall.currentExp / drawCall.exp) + Math.PI/2, false);
					ctx.stroke();
					ctx.closePath();

					// attack charge bar
					ctx.strokeStyle = 'rgb(255,255,255)';
					ctx.beginPath();
					ctx.arc(drawCall.pos.x, drawCall.pos.y, drawCall.hitbox+1, Math.PI/2, -Math.PI * ( (drawCall.attackRate - drawCall.currentAttackRate) / drawCall.attackRate) + Math.PI/2, true);
					ctx.stroke();
					ctx.closePath();

					// draw hitbox depending on player's state
					if(drawCall.alive === true){
						if(drawCall.hit > 0){
							ctx.fillStyle = "rgba(" + (drawCall.color.r) + ", " + (drawCall.color.g) + ", " + (drawCall.color.b) + ", .5)";
						}	
						else{		
							ctx.fillStyle = "rgb(" + drawCall.color.r + ", " + drawCall.color.g + ", " + drawCall.color.b + ")";
						}
					}
					else{
							ctx.fillStyle = "rgba(" + (drawCall.color.r) + ", " + (drawCall.color.g) + ", " + (drawCall.color.b) + ", .5)";

							// hp bar
							ctx.strokeStyle = 'rgb(255,255,255)';
							ctx.beginPath();
							ctx.arc(drawCall.pos.x, drawCall.pos.y, drawCall.hitbox + drawCall.grazeRadius, Math.PI/2, Math.PI * (drawCall.reviveTime - drawCall.reviveTimer) / (drawCall.reviveTime/2) + Math.PI/2, false);
							ctx.stroke();
							ctx.closePath();
					}
					ctx.beginPath();
					ctx.arc(drawCall.pos.x, drawCall.pos.y, drawCall.hitbox, 0, Math.PI * 2, false);
					ctx.fill();
					ctx.closePath();


					ctx.fillStyle = "rgba(0,0,0,.5)";
					ctx.strokeStyle = "white";
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					ctx.fillRect(2+ i * 159,510, 159, 128);
					ctx.strokeRect(2+ i * 159,510, 159, 128);
					fillText(ctx, drawCall.name, 79 + i * 159 , 525, "15pt courier", "rgb(" + drawCall.color.r  +"," + drawCall.color.g + "," + drawCall.color.b + ")");
					fillText(ctx, "Damage: " + drawCall.minDamage + "~" + drawCall.maxDamage,  79 + i * 159 , 545, "12pt courier", "#ddd");
					
					if(drawCall.skill1Used && drawCall.energy > drawCall.skill1Cost){
						ctx.save();
						ctx.fillStyle = "rgb(255, 255, 255)";
						ctx.fillRect(25 + i*159, 565, 50, 50);
						ctx.restore();
					}
					else if(drawCall.energy > drawCall.skill1Cost ){
						ctx.save();
						ctx.fillStyle = "rgba(255, 255, 255, .5)";
						ctx.strokeStyle = '#ddd'
						ctx.lineWidth = 1;
						ctx.fillRect(25 + i*159, 565, 50, 50);

						if(drawCall.type == 'bomber'){
							ctx.beginPath();
							ctx.arc(drawCall.pos.x, drawCall.pos.y, drawCall.hitbox + (drawCall.grazeRadius * ( drawCall.energy/5)), 0, Math.PI * 2, false);
							ctx.stroke();
							ctx.closePath();
						}

						ctx.restore();
					}
					ctx.strokeRect(25 + i*159, 565, 50, 50);

					if(drawCall.skill2Used && drawCall.energy > drawCall.skill2Cost){
						ctx.save();
						ctx.fillStyle = "rgb(255, 255, 255)";
						ctx.fillRect(85 + i*159, 565, 50, 50);
						ctx.restore();
					}
					else if(drawCall.energy > drawCall.skill2Cost ){
						ctx.save();
						ctx.fillStyle = "rgba(255, 255, 255, .5)";
						ctx.fillRect(85 + i*159, 565, 50, 50);
						ctx.restore();
					}
					ctx.strokeRect(85 + i*159, 565, 50, 50);
					fillText(ctx, "K", 50 + i * 159 , 628, "12pt courier", "#ddd");
					fillText(ctx, "L", 110 + i * 159 , 628, "12pt courier", "#ddd");
				}
				
				//bottom box
				ctx.strokeRect(2,510, 636, 128);

				ctx.strokeStyle = "red";
				ctx.beginPath();
				ctx.arc(320, 70, 50 , Math.PI/2 , Math.PI * (enemy.hp / (enemy.maxHp/2)) + Math.PI/2 , false);
				ctx.stroke();
				ctx.closePath();

				// draw hud				
				ctx.fillStyle = 'white';
				document.querySelector('#createRoom').style.visibility = 'hidden';
				document.querySelector('#joinRoom').style.visibility = 'hidden';
				document.querySelector('#instructions').style.visibility = 'hidden';
				ctx.textAlign = "left";
				ctx.textBaseline = "middle";
				fillText(ctx, "Room: " + room, 10, 20, "10pt courier", "#ddd");
				fillText(ctx, "View Controls - 'C'", 10, 35, "10pt courier", "#ddd");
				if(viewControls){
					fillText(ctx, 'dt: ' + dt.toFixed(3), 10, 60, "10pt courier", "#ddd");
					fillText(ctx, "Move - WASD", 10, 380, "12pt courier", "#ddd");
					fillText(ctx, "Reduce Speed - Shift", 10, 400, "12pt courier", "#ddd");
					fillText(ctx, "Attack - J", 10, 420, "12pt courier", "#ddd");
					fillText(ctx, "Skill 1 - K", 10, 440, "12pt courier", "#ddd");
					if(user.type == 'fighter'){
						fillText(ctx, "Finisher - 5 Energy", 15, 455, "10pt courier", "#ddd");
					}
					else if (user.type == 'bomber'){
						fillText(ctx, "Focused Bomb - 10 Energy", 15, 455, "10pt courier", "#ddd");
					}
					else if( user.type == 'supplier'){
						fillText(ctx, "Exp Generator - 15 Energy/per sec", 15, 455, "10pt courier", "#ddd");
					}
					else if( user.type == 'aura'){
						fillText(ctx, "Healing Aura - 15 Energy/per sec", 15, 455, "10pt courier", "#ddd");
					}
					fillText(ctx, "Skill 2 - L", 10, 480, "12pt courier", "#ddd");
					if(user.type == 'fighter'){
						fillText(ctx, "Judgement - +10 Energy", 15, 495, "10pt courier", "#ddd");
					}
					else if (user.type == 'bomber'){
						fillText(ctx, "Barrier - +15 Energy", 15, 495, "10pt courier", "#ddd");
					}
					else if( user.type == 'supplier'){
						fillText(ctx, "Energy Regen - 15 Energy/per sec", 15, 495, "10pt courier", "#ddd");
					}
					else if( user.type == 'aura'){
						fillText(ctx, "Burning Aura - 15 Energy/per sec", 15, 495, "10pt courier", "#ddd");
					}
				}
			}
		}
	}

	// Utilities
	function clamp(val, min, max){
		return Math.max(min, Math.min(max, val));
	}

	function fillText(ctx, string, x, y, css, color) {
	ctx.save();
	// https://developer.mozilla.org/en-US/docs/Web/CSS/font
	ctx.font = css;
	ctx.fillStyle = color;
	ctx.fillText(string, x, y);
	ctx.restore();
	}

	function circlesIntersect(c1,c2){
		var dx = c2.x - c1.x;
		var dy = c2.y - c1.y;
		var distance = Math.sqrt(dx*dx + dy*dy);
		return distance;
	}

	function getRandomUnitVector(){
		var x = Math.random() * 2 - 1;
		var y = Math.random() * 2 - 1;
		var length = Math.sqrt(x*x + y*y);
		if(length == 0){ // very unlikely
			x=1; // point right
			y=0;
			length = 1;
		} else{
			x /= length;
			y /= length;
		}
		
		return {x:x, y:y};
	}

	// Keyboard stuff
	var myKeys = {};
	myKeys.KEYBOARD = {
		"KEY_SHIFT": 16,
		"KEY_C": 67,
		"KEY_W": 87,
		"KEY_A": 65,
		"KEY_S": 83,
		"KEY_D": 68,
		"KEY_J": 74,
		"KEY_K": 75,
		"KEY_L": 76
	};

	myKeys.keydown = [];
	// event listeners
	window.addEventListener("keydown",function(e){
		myKeys.keydown[e.keyCode] = true;
	});
		
	window.addEventListener("keyup",function(e){
		myKeys.keydown[e.keyCode] = false;
	});

	window.onload = init;
	window.onunload = function(){
		socket.emit('disconnect');
	};
}());