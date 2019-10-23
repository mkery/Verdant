"""
LilGit Parser: Server extension for lilgit parser
"""

import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name='lilgit_parser',
    version='0.2',
    description='Server-side extension for lilgit parser',
    author='Mary Beth Kery',
    author_email='mkery@cs.cmu.edu',
    url = 'https://github.com/mkery/Verdant',
    packages=setuptools.find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ]
)
