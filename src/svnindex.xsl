<?xml version="1.0"?>
<!--

 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.

-->


<!-- A sample XML transformation style sheet for displaying the Subversion
  directory listing that is generated by mod_dav_svn when the "SVNIndexXSLT"
  directive is used. -->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

  <xsl:output method="html"/>

  <xsl:template match="*"/>

  <xsl:template match="svn">
    <html>
      <head>
        <title>
          <xsl:if test="string-length(index/@name) != 0">
            <xsl:value-of select="index/@name"/>
            <xsl:text>: </xsl:text>
          </xsl:if>
          <xsl:value-of select="index/@path"/>
        </title>

        <!-- ############################################### -->
        <!-- add_start -->

        <!-- Links to external files -->
        <!-- @@ If you would like to use another theme instead of 'humanity', you should modify the following link. @@ -->
        <link type="text/css" href="http://ajax.googleapis.com/ajax/libs/jqueryui/1.8.18/themes/humanity/jquery-ui.css" rel="stylesheet" />
        <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script>
        <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.8.18/jquery-ui.min.js"></script>

        <!-- Links to internal files -->
        <!-- @@ If you do not place files in '/svn_ajaxview', you should modify following linkes. @@ -->
        <link rel="stylesheet" type="text/css" href="/svn_ajaxview/svnindex.css"/>
        <link type="text/css" href="/svn_ajaxview/ajaxview/repository_view.css" rel="stylesheet" />

        <!-- @@ If you do not place files in '/svn_ajaxview', you should modify following linkes. @@ -->
        <script type="text/javascript" src="/svn_ajaxview/ajaxview/libs/splitter.js"></script>
        <script type="text/javascript" src="/svn_ajaxview/dav_svn.js"></script>
        <script type="text/javascript" src="/svn_ajaxview/ajaxview/dav_svn_model.js"></script>
        <script type="text/javascript" src="/svn_ajaxview/ajaxview/repository_view.js"></script>
        <!-- add_end -->
        <!-- ############################################### -->
      </head>
      <body>
        <!-- ############################################### -->
        <!-- add_start -->
        <div id="toggle_ajaxview" style="display: none;"></div>
        <div id="main" style="display: none;">
          <div id="path_view"></div>
          <div id="content_widget" class="ui-widget-content">
            <h2 id="content_header" class="ui-widget-header"><span>Contents</span><div class="ui-helper-clearfix revision_setting_elem">@<span id="revision_setting"></span></div></h2>
            <div id="content_frame">
              <div id="dir_tree"></div>
              <div id="file_list"></div>
            </div>
          </div>

          <div id="log_widget" class="ui-widget-content">
            <h2 id="log_header" class="ui-widget-header">Logs</h2>
            <div id="log_frame">
              <div id="log_view"></div>
            </div>
          </div>
        </div>
        <!-- add_end -->
        <!-- ############################################### -->

        <div class="svn">
          <xsl:apply-templates/>
        </div>
        <div class="footer">
          <!-- ############################################### -->
          <!-- add_start -->
          <div style="float: right; margin-right: 1em;">
            <a href="https://github.com/masamitsu-murase/subversion_ajax_view">Subversion Ajax View</a>
          </div>
          <!-- add_end -->
          <!-- ############################################### -->
          <xsl:text>Powered by </xsl:text>
          <xsl:element name="a">
            <xsl:attribute name="href">
              <xsl:value-of select="@href"/>
            </xsl:attribute>
            <xsl:text>Subversion</xsl:text>
          </xsl:element>
          <xsl:text> </xsl:text>
          <xsl:value-of select="@version"/>
        </div>
      </body>
    </html>
  </xsl:template>

  <xsl:template match="index">
    <div class="rev">
      <xsl:value-of select="@name"/>
      <xsl:if test="@base">
        <xsl:if test="@name">
          <xsl:text>:&#xA0; </xsl:text>
        </xsl:if>
        <xsl:value-of select="@base" />
      </xsl:if>
      <xsl:if test="@rev">
        <xsl:if test="@base | @name">
          <xsl:text> &#x2014; </xsl:text>
        </xsl:if>
        <xsl:text>Revision </xsl:text>
        <xsl:value-of select="@rev"/>
      </xsl:if>
    </div>
    <div class="path">
      <xsl:value-of select="@path"/>
    </div>
    <xsl:apply-templates select="updir"/>
    <xsl:apply-templates select="dir"/>
    <xsl:apply-templates select="file"/>
  </xsl:template>

  <xsl:template match="updir">
    <div class="updir">
      <xsl:text>[</xsl:text>
      <xsl:element name="a">
        <xsl:attribute name="href">..</xsl:attribute>
        <xsl:text>Parent Directory</xsl:text>
      </xsl:element>
      <xsl:text>]</xsl:text>
    </div>
  </xsl:template>

  <xsl:template match="dir">
    <div class="dir">
      <xsl:element name="a">
        <xsl:attribute name="href">
          <xsl:value-of select="@href"/>
        </xsl:attribute>
        <xsl:value-of select="@name"/>
        <xsl:text>/</xsl:text>
      </xsl:element>
    </div>
  </xsl:template>

  <xsl:template match="file">
    <div class="file">
      <xsl:element name="a">
        <xsl:attribute name="href">
          <xsl:value-of select="@href"/>
        </xsl:attribute>
        <xsl:value-of select="@name"/>
      </xsl:element>
    </div>
  </xsl:template>

</xsl:stylesheet>
