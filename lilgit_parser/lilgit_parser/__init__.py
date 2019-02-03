""" LilGit Parser """
'''
python setup.py install
python setup.py bdist_wheel
pip install -U -I dist/lilgit_parser-0.2-py3-none-any.whl
jupyter serverextension enable --py lilgit_parser
jupyter serverextension enable --py lilgit_parser --sys-prefix --debug

jupyter serverextension list
'''

import json
import tornado
from notebook.utils import url_path_join
from notebook.base.handlers import APIHandler
from lilgit_parser.parser import parse


class ParseHandler(APIHandler):
    """
    A handler that runs a custom parser for lilGit on the server.
    """
    def post(self):
        data = tornado.escape.json_decode(self.request.body)
        self.finish(parse(data['code']))

    def get(self):
        self.finish('Hello!')


def _jupyter_server_extension_paths():
    return [{
        'module': 'lilgit_parser'
    }]

def _jupyter_nbextension_paths():
    """
    Declare the Jupyter notebook extension paths.
    """
    return [{"section": "notebook", "dest": "lilgit_parser"}]


def load_jupyter_server_extension(nbapp):
    """
    Load the Jupyter server extension.
    """

    handlers = [("/lilgit/parse", ParseHandler)]

    # add the baseurl to our paths
    base_url = nbapp.web_app.settings["base_url"]
    handlers = [(url_path_join(base_url, x[0]), x[1]) for x in handlers]

    nbapp.web_app.add_handlers(".*", handlers)
