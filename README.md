# Subversion Ajax View

## Overview

This is an extension of Subversion server.

This extension provides users with Ajax view.  

It does **NOT** need any other server-side scripting environment, such as PHP, Ruby on Rails and so on,  
because all functions are implemented in JavaScript.

All you have to do is putting this extension in the public directory on the Subversion server and adding `SVNIndexXSLT` entry to httpd.conf.

Current version does not support Internet Explorer.  
If client-side users access via Internet Explorer, classic view is shown.

## Screenshots
Files are shown like local file expolorer.  
![Directory Contents](https://github.com/masamitsu-murase/subversion_ajax_view/raw/master/resources/images/screenshot_files.png)

Logs are also shown in browser.  
![Logs](https://github.com/masamitsu-murase/subversion_ajax_view/raw/master/resources/images/screenshot_logs.png)

## How to set up
1. Download this extension and extract it.
   Put it in the public directory on your Subversion server.  
   I assume that you put it in `/var/www/svn_ajaxview_dir` and client users can access it as `http://server/svn_ajaxview`.  
   Confirm that you can access `http://server/svn_ajaxview/svnindex.xsl` via Firefox, Chrome or Safari.  
   If you cannot, add the following Alias to httpd.conf.

        Alias /svn_ajaxview /var/www/svn_ajaxview_dir

2. Edit `/var/www/svn_ajaxview_dir/svnindex.xsl` if you do not put files in `svn_ajaxview`.  
   Please modify `href` of ajaxview.css and `src` of ajaxview.js.

        <!-- @@ If you do not place files in '/svn_ajaxview', you should modify following linkes. @@ -->
        <link type="text/css" href="/svn_ajaxview/ajaxview/ajaxview.css" rel="stylesheet" />
        <script type="text/javascript" src="/svn_ajaxview/ajaxview/ajaxview.js"></script>

3. Edit httpd.conf.  
   If you have already published Subversion repository on Apache server, you can find `<Location /svn>` entry in httpd.conf.  
   Please edit `<Location /svn>` entry in httpd.conf as follows:  

        <Location /svn>
          DAV svn
          SVNParentPath /var/www/svn_repos
          # The next line should be added.
          SVNIndexXSLT /svn_ajaxview/svnindex.xsl
        </Location>

4. Restart Apache daemon to reload httpd.conf.

## License
You can use this software under the MIT license.

Copyright (c) 2012 Masamitsu MURASE

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


This software includes the following libraries.

* [splitter.js](http://methvin.com/splitter/)  
  Developed by Dave Methvin.  
  This is a great jQuery library to split panes.  
  It is distributed under the MIT license and GPL.  
* svnindex.xsl and svnindex.css  
  Provided as a part of Subversion source code.  
  These files are distributed under the Apache license.

## Contact

If you find bugs or have requests, please let me know on GitHub page.

Author: Masamitsu MURASE  
GitHub: <https://github.com/masamitsu-murase/subversion_ajax_view>  

