module.exports = [
	{ 	
		name:'AREDL',
		fullname: "All Rated Extreme Demons List",
	  	value:'aredl',
		cutoff: null,
		cache: async () => {
			const logger = require('log4js').getLogger();
			try {
				const list = await fetch("https://api.aredl.net/v2/api/aredl/levels");
				return (await list.json()).filter((level) => !level.legacy).map((level) => {
					return {
						name: level.name,
						position: level.position,
						filename: level.name.toLowerCase().replace(/[\s()]+/g, '_').replace(/[^a-z0-9_]/g, '').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
					}
				});
			} catch(error) {
				logger.error('Failed to fetch AREDL: ' + error);
				return [];
			}
		},
	  	score: (pos, level_count) => {
			const baseFactor = 0.0005832492374192035997815;
			const b = (level_count - 1) * baseFactor;
			const a = 600 * Math.sqrt(b);
			return (a / Math.sqrt((pos - 1) / 50 + b) - 100);
		},
	},
	{ 
		name:'HDL',
		fullname: "Hard Demon List",
		value:'hdl',
		repo:'https://github.com/Robaleg9/HardDemonList.git',
		cutoff: 150,
		score: (pos, _) => {
			return ((-0.22371358 * (pos)) + 50.22371358);
		}
	},
	{
		name:'IDL',
		fullname: "Insane Demon List",
		value:'idl',
		cutoff: 150,
		cache: async () => {
			const logger = require('log4js').getLogger();
			try {
				const list = await fetch("https://insanedemonlist.com/api/levels");
				return (await list.json()).map((level) => {
					return {
						name: level.name,
						position: level.position,
						filename: level.id,
					}
				});
			} catch(error) {
				logger.error('Failed to fetch IDL: ' + error);
				return [];
			}
		},
		score: (pos, _) => {
			if (pos > 150) return 0;
			return Math.round(100*((74875 - 375*pos)/298)) / 100
		}
	},
	{
		name:'CL',
		fullname: "Challenge List",
		value:'cl',
		cutoff: 100,
		cache: async () => {
			const logger = require('log4js').getLogger();
			try {
				const list = await fetch("https://challengelist.gd/api/v1/demons/?limit=100");
				return (await list.json()).map((level) => {
					return {
						name: level.name,
						position: level.position,
						filename: level.id,
					}
				});
			} catch(error) {
				logger.error('Failed to fetch Challenge List: ' + error);
				return [];
			}
		},
		score: (pos, level_count) => {
			top_value = 250.0;
			low_value = 15.0;
			return (top_value * Math.exp(Math.log(top_value / low_value) / (1.0 - level_count) * (pos - 1.0)))
		}
	},
	{ 
		name:'UDL',
		fullname: "Unrated Demon List",
		value:'udl',
		repo:'https://github.com/Unrated-Demon-List/unrated-demon-list.git',
		cutoff: 150,
		score: (pos, _) => {
			if (pos > 150) return 0;
			const maximum_points = 250;
			return ((140 * maximum_points + 7000) / Math.sqrt(3157 * (pos - 1) + 19600) - 50);
		}
	},
	{
		name: "2PL",
		fullname: "2 Player List",
		value: "2pl",
		repo: 'https://github.com/2plist/2plist.git',
		cutoff: 75,
		score: (pos, _) => {
			return ((164.498*(Math.exp(-0.0982586*pos)))+0.896325);
		}
	},
	{
		name: "TSL",
		fullname: "The Shitty List",
		value: "tsl",
		repo: 'https://github.com/TheShittyList/TheShittyListPlus.git',
		cutoff: 150,
		score: (pos, _) => {
			return (-24.9975*Math.pow(pos-1, 0.4) + 200);
		}
	},
	{
		name:'PL',
		fullname: "Pemonlist",
		value:'pl',
		cutoff: 150,
		cache: async () => {
			const logger = require('log4js').getLogger();
			try {
				const list = await fetch("https://pemonlist.com/api/list?limit=150");
				return (await list.json()).data.map((level) => {
					return {
						name: level.name,
						position: level.placement,
						filename: level.level_id,
					}
				});
			} catch(error) {
				logger.error('Failed to fetch Pemonlist: ' + error);
				return [];
			}
		},
		score: (pos, _) => {
			return pos <= 150 ? Math.round(190.5 / (Math.log10(0.0032 * (pos + 89.8)) + 1) - 211.29) : 0;
		}
	}
]
