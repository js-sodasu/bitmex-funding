var app = new Vue({
	el: '#app',
	data(){
		return {
			fundingTurn: null,
			fundingRate: '0.0000',
			fundingInterval: 3,
			fundingTime:{
				hour:null,
				minute:null,
				second:null,
				text:null
			},
			fundingTimeCalc(){
				var arrFundingHour = [4,12,20,28]
				var datetime = new Date()
				var leftHour = null
				var leftMinutes = null
				var leftSecond = null
				for(var cnt in arrFundingHour)
				{
					var hour = arrFundingHour[cnt]
					var gap = datetime.getUTCHours() - hour
					if(gap > 0)
						continue

					leftMinutes = 60 - datetime.getUTCMinutes()
					leftSecond = 60 - datetime.getUTCSeconds()
					if(leftMinutes != 60) gap += 1
					leftHour = gap * -1
					break
				}
				
				app.fundingTime.hour = leftHour
				app.fundingTime.minute = leftMinutes
				app.fundingTime.second = leftSecond

				app.fundingTime.text = ' in '

				if(app.fundingTime.hour>0)
					app.fundingTime.text += app.fundingTime.hour+' '+((app.fundingTime.hour>1)?'hours':'hour')+' '

				if(app.fundingTime.minute>0&&app.fundingTime.minute!==60)
					app.fundingTime.text += app.fundingTime.minute+' '+((app.fundingTime.minute>1)?'minutes':'minute')+ ' '

				if(app.fundingTime.second>0&&app.fundingTime.second!==60)
					app.fundingTime.text += app.fundingTime.second+' '+((app.fundingTime.second>1)?'seconds':'second')

				
				
			},
			interestRate:null,
			contracts:{
				'XBTUSD':{
					subscribe:false,
					lastPrice:'0000.0',
					lastChangePcnt:null,
					timestamp:null
				}
			},
			indices: {
				'.BXBT':{
					subscribe:false,
					lastPrice:null,
					lastChangePcnt:null,
					markPrice:null,
					timestamp:null
				},
				'.XBTBON8H':{
					subscribe:false,
					lastPrice:null,
					lastChangePcnt:null,
					markPrice:null,
					timestamp:null
				},
				'.USDBON8H':{
					subscribe:false,
					lastPrice:null,
					lastChangePcnt:null,
					markPrice:null,
					timestamp:null
				},
				'.XBTUSDPI8H':{
					subscribe:false,
					lastPrice:null,
					lastChangePcnt:null,
					markPrice:null,
					timestamp:null
				},

			},
			socket: new WebSocket('wss://www.bitmex.com/realtime'),
			Clamp:function(val,min,max){
				if(val<min) return min
				if(val>max) return max
				return val
			}
		}
	},
	watch:{
		indices:{
			handler(obj){
				if( this.indices['.XBTBON8H'].subscribe && 
					this.indices['.USDBON8H'].subscribe && 
					this.indices['.XBTUSDPI8H'].subscribe 
					){
						
						this.interestRate = (this.indices['.USDBON8H'].lastPrice - this.indices['.XBTBON8H'].lastPrice) / this.fundingInterval
						this.fundingRate = (this.indices['.XBTUSDPI8H'].lastPrice + this.Clamp(this.interestRate - this.indices['.XBTUSDPI8H'].lastPrice,-0.05,0.05))
						this.fundingRate *= 100 
						this.fundingRate = this.fundingRate.toFixed(4)
						
						this.fundingTurn = (this.fundingRate>0)?'Shorts':'Longs'


					}

					document.getElementsByTagName("title")[0].innerHTML = 'XBTUSD '+this.contracts.XBTUSD.lastPrice
				
			},
			deep:true
		},
	},
	computed:{
		fundingClass:function(){
			return{
				'funding-long':this.fundingRate<0,
				'funding-short':this.fundingRate>0
			}
		}
	},
	methods:{
		getIndices:function(){
			var vm = this
			this.socket.onmessage = function(e){
				var res = JSON.parse(e.data)

				
				if(res.success === true)
				{
					var tmpSubscribe = res.subscribe.split(':')
					var typeSubscribe = tmpSubscribe[0]
					var symbolSubscribe = tmpSubscribe[1]
					if(typeSubscribe === 'instrument')
					{
						if(vm.contracts.hasOwnProperty(symbolSubscribe))
						{
							vm.contracts[symbolSubscribe].subscribe = true
						}
						else if(vm.indices.hasOwnProperty(symbolSubscribe))
						{
							vm.indices[symbolSubscribe].subscribe = true
						}
					}
				}


				if(res.table === 'instrument')
				{
					var arrData = res.data
					for(var d in arrData)
					{
						var tmpData = arrData[d]
						//console.log(tmpData)
						var symbol = tmpData['symbol']
						if(!tmpData.hasOwnProperty('lastPrice')) continue

						
						
						if(vm.contracts.hasOwnProperty(symbol))
						{
							vm.contracts[symbol].lastChangePcnt = tmpData['lastChangePcnt']
							vm.contracts[symbol].lastPrice = tmpData['lastPrice'].toFixed(1)
							vm.contracts[symbol].markPrice = tmpData['markPrice']
							vm.contracts[symbol].timestamp = tmpData['timestamp']	
						}
						else if(vm.indices.hasOwnProperty(symbol))
						{
							vm.indices[symbol].lastChangePcnt = tmpData['lastChangePcnt']
							vm.indices[symbol].lastPrice = tmpData['lastPrice']
							vm.indices[symbol].markPrice = tmpData['markPrice']
							vm.indices[symbol].timestamp = tmpData['timestamp']
						}
						else
							return;
						
					}
				}
			}
		}
	},
	created: function(){
		var vm = this
		this.getIndices()
		this.socket.onopen = function(e){
			var indices = [
				'instrument:XBTUSD',
				'instrument:.BXBT',
				'instrument:.XBTBON8H',
				'instrument:.USDBON8H',
				'instrument:.XBTUSDPI8H'
			]
			var op = {"op": "subscribe", "args": indices}
			vm.socket.send(JSON.stringify(op))
		}
		this.socket.onclose = function(e){}
		
		
	}
})


setInterval(app.fundingTimeCalc,500)