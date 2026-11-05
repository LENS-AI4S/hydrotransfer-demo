"""Meaningful access-contract checks, using a synthetic in-memory renderer."""
from collections import defaultdict,deque
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
import threading,unittest
from cube_preview import Handler

class FakeCube:
    def catalog(self):return {'raw_download':False,'array_access':False}
    def render(self,basin,key,depth):
        if basin!='4080477690' or key!='soil_sand' or depth!=0:raise ValueError()
        return b'\x89PNG\r\n\x1a\n'

class Contract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),Handler);cls.server.token='test-only-ephemeral-code'
        cls.server.origins={'https://example.test'};cls.server.hits=defaultdict(deque);cls.server.rate_lock=threading.Lock();cls.server.cube=FakeCube()
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
    @classmethod
    def tearDownClass(cls):cls.server.shutdown();cls.server.server_close();cls.thread.join()
    def request(self,path,method='GET',auth=True,origin=None):
        c=HTTPConnection(*self.server.server_address,timeout=5);headers={}
        if auth:headers['Authorization']='Bearer '+self.server.token
        if origin:headers['Origin']=origin
        c.request(method,path,headers=headers);r=c.getresponse();body=r.read();c.close();return r,body
    def test_no_access_without_code(self):self.assertEqual(self.request('/api/cube/catalog',auth=False)[0].status,401)
    def test_no_foreign_origin(self):self.assertEqual(self.request('/api/cube/catalog',origin='https://foreign.test')[0].status,403)
    def test_read_only_image(self):
        r,b=self.request('/api/cube/preview/4080477690/soil_sand/0.png');self.assertEqual(r.status,200);self.assertTrue(b.startswith(b'\x89PNG'));self.assertEqual(r.getheader('Cache-Control'),'private, no-store')
    def test_no_file_array_or_arbitrary_bbox_api(self):
        for p in ['/data/cube.json','/api/cube/array','/api/cube/preview/4080477690/soil_sand/0.png?bbox=0,0,1,1']:
            self.assertEqual(self.request(p)[0].status,404)
    def test_no_write_method(self):self.assertEqual(self.request('/api/cube/catalog',method='POST')[0].status,501)
    def test_unknown_basin_denied(self):self.assertEqual(self.request('/api/cube/preview/9999999999/soil_sand/0.png')[0].status,400)
if __name__=='__main__':unittest.main()
