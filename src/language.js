// Descriptions and examples are based on the Japanese and English Revolution Idle wikis.
export const commands = {
  if:['if (condition)','条件を満たす場合に子ブロックを実行します。','Runs child blocks when the condition is true.'],
  'else if':['else if (condition)','前の条件を満たさず、この条件を満たす場合に実行します。','Runs when preceding conditions are false and this condition is true.'],
  else:['else','前の条件をいずれも満たさない場合に実行します。','Runs when no preceding condition is true.'],
  Repeat:['Repeat (count, infinite)','子ブロックを指定回数または無限に繰り返します。','Repeats child blocks a specified number of times or indefinitely.'],
  RepeatUntil:['RepeatUntil (condition)','条件を満たすまで子ブロックを繰り返します。最初から条件を満たしていれば実行しません。','Repeats child blocks until the condition is true. Does not run if already true.'],
  WaitUntil:['WaitUntil (condition)','条件を満たすまで待機します。','Waits until the condition is true.'],
  WaitForSeconds:['WaitForSeconds(seconds)','指定した秒数だけ待機します。','Waits for the specified number of seconds.'],
  Prestige:['Prestige()','プレステージを実行します。','Performs Prestige.'],
  Promote:['Promote(index)','指定した色をプロモートします。','Promotes the selected color.'],
  DailyReward:['DailyReward()','デイリー報酬を取得します。','Claims the daily reward.'],
  Stop:['Stop()','マクロを停止します。','Stops the macro.'],
  GoToMacro:['GoToMacro(slot)','別のマクロに移動します。','Switches to another macro.'],
  RefinePrestige:['RefinePrestige()','精錬プレステージを実行します。','Performs Refine Prestige.'],
  PolishPrestige:['PolishPrestige()','研磨プレステージを実行します。','Performs Polish Prestige.'],
  LoadPlanets:['LoadPlanets(slot)','惑星ロードアウトを読み込みます。','Loads a planet loadout.'],
  GenerateElement:['GenerateElement(element)','元素を選択します。','Selects an element.'],
  EnterTC:['EnterTC(type, level, wait)','タロットチャレンジに入ります。','Enters a Tarot Challenge.'],
  Infinite:['Infinite()','インフィニティを実行します。','Performs Infinity.'],
  Eternate:['Eternate()','エタニティを実行します。','Performs Eternity.'],
  BreakInfinity:['BreakInfinity(enabled)','インフィニティの破壊・修復を切り替えます。','Breaks or fixes Infinity.'],
  EnterIC:['EnterIC(index, wait)','インフィニティチャレンジに入ります。','Enters an Infinity Challenge.'],
  EnterEC:['EnterEC(index, level, wait)','エタニティチャレンジに入ります。','Enters an Eternity Challenge.'],
  ExitEC:['ExitEC()','エタニティチャレンジから退出します。','Exits the Eternity Challenge.'],
  Dilate:['Dilate(enabled)','ダイレーションに入るか退出します。','Enters or exits Dilation.'],
  DTU:['DTU(branch, row, level)','ダイレーションツリーをアップグレードします。','Upgrades the Dilation Tree.'],
  LoadDT:['LoadDT(slot)','ダイレーションツリーのロードアウトを読み込みます。','Loads a Dilation Tree loadout.'],
  Restart:['Restart()','マクロを最初から再起動します。','Restarts the macro from the beginning.']
};
export const variables = {Score:['スコア','Score'],IP:['インフィニティポイント','Infinity Points'],EP:['エタニティポイント','Eternity Points'],AP:['アセンションポイント','Ascension Points'],Supernova:['超新星','Supernova'],DP:['ダイレーションポイント','Dilation Points'],DTP:['ダイレーションツリーポイント（総数）','Total Dilation Tree Points'],UnityLevel:['統一レベル','Unity level'],AttackLevel:['攻撃レベル','Attack level'],GoldAfterUnity:['統一後のゴールド','Gold after Unity'],MaxMineralLevelThisRun:['今回の最大ミネラルレベル','Maximum mineral level this run'],PPAfterPrestige:['プレステージ後のPP','PP after prestige'],Atoms:['アトム','Atoms'],Epsilon:['イプシロン','Epsilon']};
export const sample = `WaitUntil (IP >= 1000)\nif (IP >= 1000)\n\tBreakInfinity(false)\n\tRepeat (9, false)\n\t\tEnterIC(0, true)\n\tBreakInfinity(true)\n\tWaitForSeconds(10.0)\n`;
export function analyze(text, lang='ja') {
  const ja=lang==='ja', out=[]; let offset=0;
  for(const line of text.split('\n')) {
    const trimmed=line.trim(); const start=offset+line.search(/\S|$/); const end=offset+line.length;
    const add=(severity,j,e)=>out.push({from:start,to:Math.max(start+1,end),severity,message:ja?j:e});
    if(trimmed) {
      let depth=0, bad=false; for(const c of trimmed){if(c==='(')depth++;if(c===')'&&--depth<0) {bad=true;depth=0;} }
      const name=trimmed.match(/^([A-Za-z_][\w]*)/);
      if(name && !Object.hasOwn(commands,name[1])) add('error',`不明な命令: ${name[1]}`,`Unknown command: ${name[1]}`);
      const arities={WaitForSeconds:1, Infinite:0,Eternate:0,Prestige:0,Promote:1,DailyReward:0,Stop:0,Restart:0,GoToMacro:1,BreakInfinity:1,EnterIC:2,EnterEC:3,ExitEC:0,Dilate:1,DTU:3,LoadDT:1,LoadPlanets:1,GenerateElement:1,RefinePrestige:0,PolishPrestige:0,EnterTC:3,Repeat:2};
      if(name && Object.hasOwn(arities,name[1]) && !bad && depth===0){const args=trimmed.match(/^[\w]+\s*\(([^()]*)\)\s*$/);if(!args)add('error','命令の括弧または構文を確認してください。','Check the command syntax and parentheses.');else {const count=args[1].trim()?args[1].split(',').length:0;if(count!==arities[name[1]])add('error',`引数は ${arities[name[1]]} 個必要です。`,`Expected ${arities[name[1]]} arguments.`)}}
      if(bad || depth>0) add('error','括弧の対応を確認してください。','Check matching parentheses.');
      if(/^WaitForSeconds\s*\(\s*0(?:\.0+)?\s*\)/.test(trimmed)) add('info','待機時間が0秒です。ゲーム内の動作を確認してください。','The wait is zero seconds. Check its behavior in game.');
      if(/(?:&&|\|\||\^)\s*.*(?:&&|\|\||\^)/.test(trimmed)) add('info','条件は左から順に評価されます。演算子の優先順位に注意してください。','Conditions are evaluated from left to right. Check operator order.');
      if(/^RepeatUntil\b/.test(trimmed)) add('info','条件が最初から成立している場合、子ブロックは実行されません。','Child blocks do not run if the condition is already true.');
    }
    offset+=line.length+1;
  } return out;
}
