import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {Pagination} from '../../components/ui/Pagination';
test('pagination renders first, final and empty ranges without NaN',()=>{
 for(const [page,total,size,start,end] of [[1,108,10,1,10],[11,108,10,101,108]]){
  const markup=renderToStaticMarkup(<Pagination currentPage={page} totalPages={Math.ceil(total/size)} totalItems={total} pageSize={size} onPageChange={()=>{}}/>);
  assert.ok(!markup.includes('NaN'));assert.ok(markup.includes(String(start).replace(/\d/g,c=>'۰۱۲۳۴۵۶۷۸۹'[Number(c)])));assert.ok(markup.includes(String(end).replace(/\d/g,c=>'۰۱۲۳۴۵۶۷۸۹'[Number(c)])));
 }
 assert.equal(renderToStaticMarkup(<Pagination currentPage={1} totalPages={1} totalItems={0} pageSize={10} onPageChange={()=>{}}/>),'');
});
test('Orders and migrated catalog callers supply item count and page size',()=>{
 for(const page of ['sales/OrdersPage','catalog/ProductsPage','catalog/VariantsPage']){
  const source=readFileSync(`src/admin/pages/${page}.tsx`,'utf8');
  for(const call of source.matchAll(/<Pagination[\s\S]*?\/>/g)){assert.match(call[0],/totalItems=/);assert.match(call[0],/pageSize=/);}
 }
});
