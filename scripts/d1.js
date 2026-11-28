import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
// A small D1 stand-in on node:sqlite: prepared statements, first/all/run and batch transactions.
export function d1(){
  const db=new DatabaseSync(':memory:');
  for(const file of ['0001_users','0002_exports','0003_credits','0004_stars_payments'])db.exec(readFileSync(new URL(`../migrations/${file}.sql`,import.meta.url),'utf8'));
  const statement=(sql,args=[])=>({sql,args,bind:(...values)=>statement(sql,values),
    first:async()=>db.prepare(sql).get(...args)??null,all:async()=>({results:db.prepare(sql).all(...args)}),
    run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}}),
    exec:()=>/^\s*select/i.test(sql)?{results:db.prepare(sql).all(...args),meta:{changes:0}}:{results:[],meta:{changes:Number(db.prepare(sql).run(...args).changes)}}});
  return {raw:db,prepare:sql=>statement(sql),batch:async list=>{db.exec('BEGIN');try{const out=list.map(item=>item.exec());db.exec('COMMIT');return out;}catch(error){db.exec('ROLLBACK');throw error;}}};
}
