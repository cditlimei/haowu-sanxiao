import {LEVELS} from '../../data/levels.mjs';
import {challengeDeals} from './challenge-deals.mjs';
export function hasChallengeDeal(config){return config.variant===6&&Object.hasOwn(challengeDeals,config.id);}
export function rng(seed){
 return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
function shuffle(arr,r){
 for(let i=arr.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
 return arr;
}
function lateStacks(config,types,r,recovery,challenge){
 // The last goal triple is split across the bottoms of three different stacks.
 // A safe witness is dealt in waves of four interleaved match types; the
 // fourth type enters while the first two still occupy tray slots.
 const goalTypes=config.goals.map(g=>g.type).filter(t=>types.includes(t));
 const last=goalTypes[0];
 const milestone=config.id%10===0&&!recovery;
 const triples=config.id<350?12:config.id<1500?15:milestone?18:[13,15,17,16,17,18,17,19][config.id%8];
 const closingSets=milestone?2:1;
 const bag=shuffle(types.filter(t=>t!==last),r);
 while(bag.length<triples-closingSets)bag.push(...shuffle([...types],r));
 const wave=bag.slice(0,triples-closingSets),route=[],pools=Array.from({length:6},()=>[]);
 function deal(type){
  const low=Math.min(...pools.map(p=>p.length));
  const eligible=shuffle(pools.map((p,i)=>i).filter(i=>pools[i].length===low),r);
  const index=eligible.find(i=>pools[i].at(-1)!==type)??eligible[0];
  pools[index].push(type);route.push(index);
 }
 for(let i=0;i<wave.length;i+=4){
  const group=wave.slice(i,i+4);
  const pattern=group.length===4?[0,1,2,0,3,1,0,2,1,3,2,3]:[...group.keys(),...group.keys(),...group.keys()];
  for(const slot of pattern)deal(group[slot]);
 }
 for(let i=0;i<3*closingSets;i++)deal(last);
 const goals=goalTypes.map(type=>({type,count:pools.flat().filter(t=>t===type).length}));
 return {id:config.id,variant:config.variant??0,piles:pools.map(a=>a.reverse()),route,goals,capacity:7,
  starAfter:recovery?2:3,pace:milestone?'压轴收集':recovery?'缓冲':challenge?'深堆挑战':'交错深堆'};
}
// Each stack lists item types from bottom to top.
const challengeStacks={
 10: {route:[2,0,1,3,4,5,2,0,4,3,5,1,5,4,2,1,3,0,4,3,1,2,0,5,3,2,5,0,4,1,1,3,5],variant:1, piles:[
  [30,11199,29,0,0],
  [2,30,4,11509,29,45],
  [11199,10961,29,33,33],
  [2,10961,11199,6,11509,33],
  [30,10961,6,45,0],
  [2,4,4,11509,6,45],
 ]},
 569: {route:[3,5,4,0,1,2,5,0,2,1,4,3,3,0,5,2,4,1,3,1,4,0,5,2,3,0,2,5,1,4,2,1,3,4,5,0,0,5,2,3,4,1,3,0,2],variant:6, piles:[
  [30,0,10961,33,29,45,12588,10961],
  [12588,6,10961,4,45,11509,11509],
  [30,0,11199,6,29,11509,29,29],
  [30,12588,33,11199,11509,11509,11509,10961],
  [0,10961,33,45,29,12588,12588],
  [12588,6,11199,4,4,10961,29],
 ]},
 1530: {route:[5,0,4,2,3,1,4,0,2,1,3,5,1,2,0,4,3,5,4,5,3,2,1,0,5,3,1,0,2,4,0,2,1,3,5,4,2,0,5,3,1,4,4,0,5,1,2,3,5,4,3,0,1,2],variant:6, piles:[
  [69,78,67,68,68,71,76,71,78],
  [69,67,67,12575,70,76,12576,77,78],
  [69,78,73,70,73,71,12575,78,12576],
  [70,67,73,73,12575,12575,71,71,77],
  [70,73,67,73,12575,12576,12576,12576,71],
  [70,67,78,70,68,76,12575,77,12576],
 ]},
};

export function hasSampleStacks(config){
 return challengeStacks[config.id]?.variant===config.variant&&Object.hasOwn(challengeStacks,config.id);
}
// Index by playable order because the later level numbers contain gaps.
const campaignOrder=new Map(LEVELS.map(({id},index)=>[id,index]));
export function usesCadence(config){
 return config.id>10&&config.variant===6&&!hasSampleStacks(config);
}
// Deal offsets calibrated against greedy play for challenge and recovery rounds.
const paceOffsets={
 14:1,18:2,19:1,22:3,26:4,27:1,30:7,34:37,38:15,42:9,43:1,46:16,47:3,50:5,
 54:13,55:2,58:2,59:2,62:1,63:1,66:45,67:1,70:5,71:4,74:16,82:4,83:3,86:10,
 87:2,90:23,94:16,98:17,102:4,106:47,110:7,111:1,114:6,118:17,119:2,122:30,123:1,126:23,
 127:1,130:34,131:5,134:18,135:1,138:12,142:14,143:2,146:1,147:1,150:10,154:36,155:2,159:1,
 162:12,163:1,166:24,167:2,170:11,171:1,174:8,178:31,182:38,183:1,186:34,187:1,190:46,194:29,
 195:2,198:2,199:4,202:7,203:1,206:9,210:46,214:6,215:1,218:11,219:1,222:33,223:7,226:7,
 230:40,235:1,238:29,242:16,243:1,246:30,247:2,250:10,251:1,254:16,258:22,262:10,266:12,267:2,
 270:38,271:2,274:14,278:34,279:1,282:9,283:1,286:1,287:2,290:41,294:1,295:3,298:2,302:10,
 306:9,310:20,311:2,314:35,318:19,319:2,322:14,323:1,326:23,327:2,330:42,334:2,338:17,339:2,
 342:10,346:6,350:19,351:1,354:9,355:2,358:42,359:3,362:2,363:7,366:15,367:5,370:35,371:1,
 374:10,378:24,382:40,383:4,390:6,394:1,395:2,398:33,399:5,402:39,403:2,406:16,407:11,410:24,
 411:1,414:33,415:11,418:24,419:3,422:6,423:3,426:22,427:2,430:16,434:36,438:43,439:2,442:3,
 443:1,446:17,450:10,454:30,458:10,459:4,462:11,463:2,466:5,467:1,470:26,474:9,478:44,482:27,
 483:2,486:33,487:2,490:17,494:7,495:1,498:10,499:2,502:8,503:1,506:31,507:2,510:14,514:5,
 515:1,518:44,522:41,523:1,526:1,527:4,530:28,531:2,534:9,535:3,538:41,539:1,542:14,543:1,
 546:24,547:1,550:23,551:6,554:14,555:2,558:30,559:2,562:3,563:1,566:10,570:1,574:14,575:2,
 578:29,579:1,582:34,583:2,586:3,590:22,591:6,594:4,595:4,598:5,599:8,602:8,603:4,606:28,
 610:6,611:1,614:4,615:1,618:40,619:3,622:31,623:3,626:30,627:1,630:3,634:41,635:1,638:11,
 642:1,646:28,647:1,650:18,651:5,658:10,659:2,662:44,663:2,666:19,667:1,671:2,674:38,675:4,
 678:5,679:1,682:20,683:2,686:9,690:17,694:46,698:6,699:1,702:23,703:5,706:28,707:1,710:33,
 711:2,714:29,718:45,722:5,726:40,727:4,734:37,735:2,738:35,739:1,742:44,743:2,746:4,750:19,
 751:1,754:7,755:2,758:23,762:2,766:38,767:2,770:2,771:1,774:30,775:3,778:20,782:17,783:3,
 786:1,787:2,790:47,791:3,794:7,798:12,799:2,802:27,803:1,806:18,807:1,810:1,811:1,814:7,
 815:2,819:1,822:24,826:6,827:1,830:5,834:24,838:19,842:36,846:28,847:3,850:15,854:3,858:10,
 862:2,863:1,866:5,867:2,870:20,871:3,874:18,875:1,878:29,879:1,882:21,883:3,886:12,887:1,
 890:6,894:13,895:1,898:39,902:19,903:1,906:24,910:1,911:1,914:45,918:17,919:7,922:37,926:10,
 927:1,930:28,934:2,935:2,938:33,942:25,947:1,950:37,954:3,955:1,958:24,959:2,962:4,963:1,
 966:41,967:1,970:1,971:1,974:26,978:47,982:7,983:6,986:9,987:1,990:16,991:1,994:35,998:14,
 999:4,1002:8,1006:18,1007:1,1010:4,1014:17,1018:35,1022:14,1026:35,1030:5,1031:2,1034:36,1038:30,1039:2,
 1042:37,1043:2,1046:9,1047:2,1050:34,1054:19,1055:1,1059:3,1062:4,1063:3,1066:37,1067:1,1070:33,1071:4,
 1074:7,1075:2,1078:24,1082:3,1083:4,1086:3,1087:4,1090:34,1091:1,1094:44,1095:1,1098:4,1102:46,1103:2,
 1106:6,1110:17,1111:1,1114:2,1118:39,1122:16,1123:1,1126:14,1127:1,1130:33,1131:2,1134:34,1135:2,1138:20,
 1143:2,1146:8,1150:13,1151:2,1154:11,1158:17,1162:20,1166:1,1167:1,1170:13,1174:19,1178:17,1182:31,1183:6,
 1186:1,1187:1,1190:28,1191:1,1194:20,1198:6,1199:3,1202:26,1203:1,1206:29,1207:1,1210:34,1214:9,1215:1,
 1218:26,1222:11,1227:16,1228:2,1231:9,1235:7,1239:7,1240:3,1243:19,1248:20,1249:1,1252:28,1253:2,1256:30,
 1257:2,1260:44,1264:26,1268:25,1272:41,1273:2,1276:1,1280:29,1284:45,1285:1,1288:9,1289:5,1292:35,1296:41,
 1297:1,1300:32,1304:18,1305:2,1308:31,1309:3,1312:13,1313:1,1316:9,1320:41,1321:1,1324:1,1325:1,1328:24,
 1332:7,1336:35,1337:1,1344:10,1345:1,1348:2,1349:3,1352:11,1353:1,1356:16,1360:38,1364:20,1365:1,1368:35,
 1369:3,1372:2,1376:12,1380:32,1381:1,1384:11,1385:2,1388:44,1392:4,1393:3,1396:5,1397:1,1400:20,1404:16,
 1408:9,1412:1,1416:45,1420:5,1421:2,1424:5,1428:6,1432:34,1436:39,1437:2,1440:43,1444:3,1445:1,1448:19,
 1452:33,1456:26,1460:24,1461:3,1464:13,1468:19,1469:4,1472:6,1476:14,1480:38,1484:45,1485:1,1488:5,1489:1,
 1492:20,1493:2,1496:2,1497:1,1500:41,1501:2,1504:17,1505:1,1508:27,1512:32,1513:3,1516:12,1517:3,1520:42,
 1521:3,1525:17,1528:2,1529:13,1532:11,1533:18,1536:47,1537:1,1540:8,1541:2,1544:11,1545:7,1548:31,1549:2,
 1552:44,1553:1,1557:5,1560:17,1561:2,1564:42,1565:6,1568:43,1569:4,1572:19,1573:12,1577:38,1578:17,1581:23,
 1582:1,1585:27,1586:13,1589:3,1593:11,1597:9,1598:7,1601:12,1602:3,1605:7,1606:1,1609:6,1610:2,1613:7,
 1614:1,1617:29,1618:29,1621:1,1625:5,1629:12,1633:15,1634:4,1637:18,1641:26,1642:3,1645:20,1646:4,1649:9,
 1653:37,1654:1,1657:26,1658:7,1661:36,1662:6,1665:15,1666:1,1669:34,1670:1,1673:7,1674:6,1678:2,1681:14,
 1685:24,1686:11,1689:6,1690:11,1693:7,1694:1,1697:36,1698:2,1701:12,1702:2,1705:26,1706:6,1709:4,1710:2,
 1713:10,1714:3,1717:4,1721:4,1722:2,1725:6,1726:4,1729:10,1730:6,1733:37,1734:3,1737:2,1738:7,1741:7,
 1742:1,1745:16,1746:12,1749:1,1750:2,1753:44,1757:34,1758:1,1761:3,1762:4,1765:21,1769:3,1773:24,1774:6,
 1777:42,1778:4,1781:42,1782:2,1785:11,1786:3,1789:4,1790:27,1793:4,1797:24,1798:1,1801:21,1805:46,1806:6,
 1809:8,1810:4,1813:28,1814:1,1817:13,1818:2,1821:15,1822:1,1825:1,1826:2,1833:27,1834:1,1837:23,1838:9,
 1842:14,1843:1,1847:29,1848:1,1853:14,1854:4,1858:45,1859:3,1863:2,1868:41,1869:7,1873:20,1874:2,1877:13,
 1883:22,1886:4,1890:3,1894:8,1896:3,1899:3,1900:11,1903:2,1908:17,1910:3,1914:18,1915:7,1918:46,1922:17,
 1923:1,1927:18,1928:1,1932:32,1933:1,1936:3,1941:5,1942:3,1945:15,1946:1,1949:2,1950:2,1953:2,1958:13,
 1959:3,1963:1,1967:2,1968:2,1971:1,1973:7,1976:12,1980:29,1981:3,1984:8,1985:1,1989:35,1993:12,1994:5,
 1997:5,1998:14,2002:16,2006:36,2007:3,2011:10,2015:21,2017:4,2020:17,2021:1,2024:33,2025:1,2028:16,2029:4,
 2033:23,2034:3,2037:1,2038:2,2041:15,2042:1,2045:16,2046:3,2051:3,2052:4,2055:26,2056:3,2062:19,2063:4,
 2066:18,2070:5,2071:9,2074:40,2075:1,2078:27,2079:13,2082:28,2083:1,2087:2,2091:9,2092:6,2095:18,2096:1,
 2099:1,2101:4,2104:32,2109:10,2110:2,2113:24,2114:2,2117:10,2119:2,2122:16,2126:5,2129:1,2133:39,2134:1,
 2137:16,2138:4,2142:9,2145:36,2146:2,2149:28,2150:2,2153:18,2154:10,2157:11,2158:14,2161:9,2162:6,2166:7,
 2167:2,2171:12,2176:6,2180:14,2181:5,2184:22,2185:2,2189:6,2193:1,2194:2,2197:5,2198:8,2201:18,2202:1,
 2205:33,2206:1,2209:1,2214:26,2218:37,2219:1,2222:11,2226:19,2230:21,2231:2,2235:23,2236:5,2239:25,2244:1,
 2247:12,2252:15,2253:1,2256:4,2258:2,2262:1,2263:4,2266:14,2267:4,2273:7,2274:2,2277:8,2278:1,2281:21,
 2285:34,2289:1,2290:5,2294:23,2295:2,2299:8,2300:1,2303:10,2304:1,2307:23,2308:23,2311:24,2312:3,2315:13,
 2316:1,2319:8,2323:7,2324:9,2331:20,2332:1,2335:25,2336:2,2339:43,2340:1,2343:21,2347:37,2348:1,2351:26,
 2352:8,2355:35,2356:1,2359:27,2360:2,2363:32,2364:1,2367:28,2368:1,2371:16,2376:3,2378:2,2383:3,2386:20,
 2387:10,2390:10,2391:3,2394:26,2395:4,2399:6,2403:38,2404:1,2407:31,2408:1,2411:30,2412:1,2415:15,2419:1,
 2423:14,2424:1,2427:5,2428:2,2431:14,2432:5,2436:37,2437:8,2440:21,2441:1,2444:6,2446:4,2449:1,2454:22,
 2455:5,2458:28,2462:17,2463:5,2466:44,2467:1,2470:36,2471:8,2474:33,2475:2,2478:28,2479:3,2482:10,2483:1,
 2487:36,2491:1,2492:2,2495:10,2496:2,2499:6,2501:2,2505:26,2506:4,2509:16,2510:2,2514:2,2517:22,2518:3,
 2521:7,2522:14,2525:7,2526:4,2529:2,2530:15,2533:33,2534:7,2537:22,2541:46,2542:1,2545:8,2546:1,2549:1,
 2550:5,2554:19,2555:7,2558:2,2559:1,2562:27,2563:5,2566:26,2567:1,2571:34,2576:1,2577:1,2581:14,2583:14,
 2586:21,2588:4,2592:15,2596:15,2598:7,2601:7,2602:7,2606:12,2607:4,2610:16,2611:3,2614:14,2615:3,2618:43,
 2623:17,2624:2,2627:2,2631:1,2632:4,2636:8,2637:6,2640:31,2641:4,2645:24,2646:1,2649:5,2650:3,2653:9,
 2654:4,2657:4,2661:15,2662:2,2665:2,2671:6,2674:42,2675:1,2679:18,2683:1,2684:6,2687:14,2691:15,2692:1,
 2695:3,2697:1,2700:33,2701:3,2706:41,2707:9,2711:10,2713:2,2716:39,2722:8,2730:5,2731:7,2734:38,2739:44,
 2740:3,2744:9,2745:4,2748:33,2749:6,2752:13,2754:8,2757:16,2760:2,2763:17,2768:6,2772:4,2773:2,2778:2,
 2781:4,2782:8,2785:10,2786:1,2789:4,2794:20,2795:7,2798:5,2799:2,2802:3,2803:4,2806:20,2807:10,2810:39,
 2811:1,2814:22,2815:10,2818:26,2819:9,2822:12,2823:3,2827:7,2828:22,2831:4,2835:36,2836:2,2839:28,2840:1,
 2843:30,2844:2,2847:5,2851:37,2855:21,2857:3,2860:24,2861:3,2864:42,2868:28,2872:12,2873:13,2876:43,2877:2,
 2880:7,2881:2,2884:15,2885:2,2888:11,2889:2,2892:38,2893:9,2896:23,2900:20,2904:15,2905:5,2908:23,2912:13,
 2913:7,2916:30,2917:2,2920:10,2921:2,2924:1,2925:5,2928:44,2929:1,2932:26,2933:9,2936:11,2940:28,2941:4,
 2944:2,2945:9,2948:37,2949:2,2952:40,2953:1,2956:12,2957:4,2960:7,2961:8,2964:17,2968:8,2972:11,2973:13,
 2976:29,2977:2,2980:11,2984:7,2985:2,2988:46,2989:6,2992:40,2993:4,4109:1,4110:6,4113:33,4117:10,4118:11,
 4121:33,4125:31,4126:2,4130:5,4133:18,4137:26,4138:2,4142:4,4143:1,4146:32,4147:2,4150:27,4151:1,4154:8,
 4155:1,5654:24,13561:11,13562:3,13565:7,13566:5,13569:21,13570:1,13573:22,13574:2,13577:20,13579:2,13586:9,13591:2,
 13599:34,13606:10,13607:1,13611:28,13612:9,13615:2,13616:1,13620:29,13621:4,13624:4,13625:4,13628:2,13629:3,13634:42,
 13636:5,13639:18,13640:1,13643:30,13647:2,13803:3,13980:1,13985:4,13986:2,13989:45,13994:9,13995:1,13998:3,14006:3,
 14017:27,14022:2,14645:11,17681:39,17682:6,17849:42,
};
function pacedDeal(plan,config){
 const index=campaignOrder.get(config.id);
 const beat=(index-10)%4;
 const afterSample=hasSampleStacks({id:LEVELS[index-1]?.id,variant:6});
 const pace=afterSample||beat===0?'缓冲':beat===3?'挑战':'拆堆';
 const width=pace==='缓冲'?2:pace==='挑战'?4:3;
 const counts=new Map();
 for(const type of plan.piles.flat())counts.set(type,(counts.get(type)??0)+1);
 const bag=[];
 for(const [type,count] of counts)for(let i=0;i<count;i+=3)bag.push(type);
 const r=rng(config.seed+71239+(paceOffsets[config.id]??0));
 shuffle(bag,r);
 // Close harder boards with a required triple, so goals cannot finish prematurely.
 const closing=plan.goals.at(-1).type;
 bag.splice(bag.indexOf(closing),1);
 const piles=plan.piles.map(()=>[]),route=[];
 function deal(type){
  const shortest=Math.min(...piles.map(s=>s.length));
  const choices=piles.map((s,i)=>i).filter(i=>piles[i].length===shortest);
  const i=choices[Math.floor(r()*choices.length)];
  piles[i].push(type);route.push(i);
 }
 if(pace==='缓冲'){
  const first=bag.splice(0,1)[0];
  for(let i=0;i<3;i++)deal(first);
 }
 while(bag.length){
  const group=[];
  while(group.length<width&&bag.length){
   const i=bag.findIndex(t=>!group.includes(t));
   group.push(bag.splice(Math.max(i,0),1)[0]);
  }
  const order=group.length===4?[0,1,2,0,3,1,0,2,1,3,2,3]:
   group.length===3&&pace==='拆堆'?[0,1,0,2,1,0,2,1,2]:
   [...group.keys(),...group.keys(),...group.keys()];
  for(const i of order)deal(group[i]);
 }
 for(let i=0;i<3;i++)deal(closing);
 return {...plan,pace,piles:piles.map(s=>s.reverse()),route};
}
export function design(config,tuned=true,useSample=true,useCadence=true){
 const plan=standardDesign(config,tuned);
 if(useCadence&&usesCadence(config))return pacedDeal(plan,config);
 if(!useSample||!hasSampleStacks(config))return plan;
 const sample=challengeStacks[config.id];
 return {...plan,piles:sample.piles.map(stack=>[...stack]),route:[...sample.route]};
}
function standardDesign(config,tuned){
 if(config.layout?.chainStacks){
  const items=config.inventory.flatMap(({type,count})=>Array(count).fill(type));
  const piles=config.layout.fans.map(fan=>fan.map(id=>items[id]));
  const d={id:config.id,variant:config.variant,piles,route:[],capacity:7,starAfter:2,goals:config.goals,pace:'策略'};
  d.route=solve(d);return d;
 }
 // Hand-tuned deals ease players into the six-bottom collection milestone.
 const id=config.id;
 const calibrated=tuned&&hasChallengeDeal(config);
 const dealOffset=calibrated?challengeDeals[id]:({1529:12,1530:14})[id]??0;
 const r=rng((config.seed??id)+dealOffset), tier=id<5?0:id<16?1:id<65?2:id<350?3:id<1500?4:5;
 const beat=id%8, recovery=tier>=2&&beat===0, challenge=tier>=2&&beat===7;
 const types=[...new Set([...config.goals,...config.inventory,...(config.sourceCounts?.inventory??[])].map(g=>g.type))].slice(0,config.introSequence?config.inventory.length:[3,4,5,6,6,7][tier]);
 if((tier===5||calibrated)&&types.length>=4)return lateStacks(config,types,r,recovery,challenge);
 const stacks=Math.min(6,types.length*3);
 const sets=Math.max(types.length,[3,5,7,9,11,13][tier]+(recovery?-2:challenge?1:0));
 const width=Math.min(types.length,[1,2,2,3,3,3][tier]-(recovery?1:0));
 const pools=Array.from({length:stacks},()=>[]),route=[];
 const bag=[];while(bag.length<sets)bag.push(...shuffle([...types],r));
 for(let start=0;start<sets;){
  const batch=bag.slice(start,Math.min(start+width,sets));
  const sequence=[...batch,...shuffle([...batch],r),...shuffle([...batch],r)];
  for(const t of sequence){
   const min=Math.min(...pools.map(p=>p.length));
   const candidates=shuffle(pools.map((p,i)=>i).filter(i=>pools[i].length===min),r);
   const i=candidates.find(i=>pools[i].at(-1)!==t)??candidates[0];
   pools[i].push(t);route.push(i);
  }
  start+=batch.length;
 }
 const counts=new Map();for(const type of pools.flat())counts.set(type,(counts.get(type)??0)+1);
 const goals=config.goals.filter(g=>counts.has(g.type)).map(g=>({type:g.type,count:counts.get(g.type)}));
 return {id,goals,variant:config.variant??0,piles:pools.map(p=>p.reverse()),route,capacity:7,starAfter:tier>=2?2:0,
  pace:recovery?'缓冲':challenge?'挑战':['入门','熟悉','拆堆','交错','策略','进阶'][tier]};
}
export function createPlay(d){return {piles:d.piles.map(s=>[...s]),tray:[],sets:0,collected:{},used:false,status:'playing'};}
export function move(p,d,i,star=false){
 if(p.status!=='playing'||!p.piles[i]?.length)return false;
 const t=p.piles[i].at(-1);
 if(star){
  if(!d.starAfter||p.used||p.sets<d.starAfter)return false;
  let count=p.tray.filter(v=>v===t).length;
  if(count+p.piles.reduce((n,s)=>n+s.filter(v=>v===t).length,0)<3)return false;
  p.tray=p.tray.filter(v=>v!==t);
  p.piles[i].pop();count++;
  for(const s of p.piles)for(let j=s.length-1;j>=0&&count<3;j--)if(s[j]===t){s.splice(j,1);count++;}
  p.used=true;p.sets++;p.collected[t]=(p.collected[t]??0)+3;
 }else{
  p.tray.push(p.piles[i].pop());
  if(p.tray.filter(x=>x===t).length===3){p.tray=p.tray.filter(x=>x!==t);p.sets++;p.collected[t]=(p.collected[t]??0)+3;}
 }
 if(p.tray.length>=d.capacity)p.status='lost';
 else if(d.goals?.length?d.goals.every(g=>(p.collected[g.type]??0)>=g.count):!p.tray.length&&p.piles.every(s=>!s.length))p.status='won';
 return true;
}
export function certify(d){
 const p=createPlay(d);let peak=0;
 for(const i of d.route){if(p.status==='won')break;if(!move(p,d,i))return null;peak=Math.max(peak,p.tray.length);}
 return p.status==='won'?{peak,steps:d.route.length}:null;
}
// Search edited stacks without spending the star. Heights uniquely determine the tray counts.
export function solve(d){
 if(certify(d))return d.route;
 const seen=new Set(),path=[];
 function search(p){
  if(p.status==='won')return true;
  if(p.status==='lost'||seen.size>=80000)return false;
  const key=p.piles.map(a=>a.length).join(',');if(seen.has(key))return false;seen.add(key);
  const choices=p.piles.map((s,i)=>({i,t:s.at(-1)})).filter(x=>x.t!==undefined);
  const score=t=>p.tray.filter(v=>v===t).length*10+choices.filter(c=>c.t===t).length;
  for(const {i} of choices.sort((a,b)=>score(b.t)-score(a.t))){
   const q={...p,collected:{...p.collected},piles:p.piles.map(s=>[...s]),tray:[...p.tray]};move(q,d,i);path.push(i);
   if(search(q))return true;path.pop();
  }return false;
 }
 return search(createPlay(d))?[...path]:null;
}
